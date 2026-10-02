export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'
import { runScanner } from '@fact-ledger/scanner'

export async function POST() {
  try {
    const startTime = Date.now()

    // Query published pages and active/deprecated facts (excluding drafts)
    const [pages, facts] = await Promise.all([
      sanityWriteClient.fetch<any[]>(`*[_type == "page" && !(_id in path("drafts.**"))]`),
      sanityWriteClient.fetch<any[]>(`*[_type == "fact" && !(_id in path("drafts.**"))]`),
    ])

    const findings = runScanner(pages, facts)
    const existingFindings = await sanityWriteClient.fetch<any[]>(`*[_type == "finding" && status == "open"]`)

    const tx = sanityWriteClient.transaction()
    let createdCount = 0
    let resolvedCount = 0

    // Resolve findings no longer present
    for (const existing of existingFindings) {
      const stillExists = findings.some(
        f =>
          f.pageId === existing.pageId &&
          f.factId === existing.factId &&
          f.rule === existing.rule &&
          (existing.rule === 'R4' || f.blockKey === existing.blockKey) &&
          f.startOffset === existing.startOffset
      )
      if (!stillExists) {
        tx.patch(existing._id, p => p.set({ status: 'resolved', resolvedAt: new Date().toISOString() }))
        resolvedCount++
      }
    }

    // Create new findings
    for (const finding of findings) {
      const alreadyExists = existingFindings.some(
        (existing: any) =>
          finding.pageId === existing.pageId &&
          finding.factId === existing.factId &&
          finding.rule === existing.rule &&
          (finding.rule === 'R4' || finding.blockKey === existing.blockKey) &&
          finding.startOffset === existing.startOffset
      )
      if (!alreadyExists) {
        tx.create({
          _type: 'finding',
          status: 'open',
          pageId: finding.pageId,
          factId: finding.factId,
          page: finding.pageId !== 'none' ? { _type: 'reference', _ref: finding.pageId } : undefined,
          fact: { _type: 'reference', _ref: finding.factId },
          rule: finding.rule,
          blockKey: finding.blockKey,
          childKey: finding.childKey,
          startOffset: finding.startOffset,
          endOffset: finding.endOffset,
          excerpt: finding.excerpt,
          foundValue: finding.foundValue,
          expectedValue: finding.expectedValue,
          detectedAt: new Date().toISOString(),
        })
        createdCount++
      }
    }

    const duration = Date.now() - startTime
    tx.create({
      _type: 'scanRun',
      startedAt: new Date(startTime).toISOString(),
      trigger: 'manual',
      status: 'completed',
      metrics: {
        pagesScanned: pages.length,
        factsScanned: facts.length,
        findingsCreated: createdCount,
        findingsResolved: resolvedCount,
        durationMs: duration,
        open: findings.length,
      },
    })

    await tx.commit()

    return NextResponse.json({
      success: true,
      scanned: { pages: pages.length, facts: facts.length },
      findings: { total: findings.length, created: createdCount, resolved: resolvedCount },
      durationMs: duration,
    })
  } catch (error: any) {
    console.error('Scan API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
