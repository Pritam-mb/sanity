export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { runScanner } from '@fact-ledger/scanner'
import crypto from 'crypto'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET

export async function POST(req: Request) {
  try {
    const bodyText = await req.text()
    
    // Validate signature if secret is provided
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get('sanity-webhook-signature')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      
      const parsedSignature = signature.split(',').reduce<Record<string, string>>((acc, pair) => {
        const [key, value] = pair.split('=')
        acc[key.trim()] = value.trim()
        return acc
      }, {})
      
      const timestamp = parsedSignature.t
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(`${timestamp}.${bodyText}`)
        .digest('base64')
        
      // Use url-safe base64 logic if needed, but simple comparison often suffices for Sanity
      const formattedExpected = expectedSignature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      if (parsedSignature.v1 !== formattedExpected && parsedSignature.v1 !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(bodyText)
    const doc = payload

    if (!doc || !doc._type || !doc._id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Determine scope of scan
    let pagesToScan: any[] = []
    let factsToScan: any[] = []
    
    const startTime = Date.now()

    if (doc._type === 'page') {
      // If a page changed, we scan this page against ALL facts
      pagesToScan = [doc]
      factsToScan = await client.fetch(`*[_type == "fact" && !(_id in path("drafts.**"))]`)
    } else if (doc._type === 'fact') {
      // If a fact changed, we scan ALL pages against this fact (and others)
      pagesToScan = await client.fetch(`*[_type == "page" && !(_id in path("drafts.**"))]`)
      factsToScan = await client.fetch(`*[_type == "fact" && !(_id in path("drafts.**"))]`)
    } else {
      return NextResponse.json({ message: 'Ignored document type' }, { status: 200 })
    }

    if (doc._type === 'page') {
       pagesToScan = await client.fetch(`*[_type == "page" && !(_id in path("drafts.**"))]`)
    }

    // Run Scanner
    const newFindings = runScanner(pagesToScan, factsToScan)
    console.log(`[DEBUG] runScanner generated ${newFindings.length} findings from ${pagesToScan.length} pages and ${factsToScan.length} facts`);
    
    // Fetch existing open findings
    const existingFindings = await client.fetch(`*[_type == "finding" && status == "open"]`)
    
    // Compare new findings with existing ones
    const tx = client.transaction()
    let createdCount = 0
    let resolvedCount = 0

    // 1. Resolve findings that no longer exist
    for (const existing of existingFindings) {
      const stillExists = newFindings.some(f => 
        f.pageId === existing.pageId && 
        f.factId === existing.factId && 
        f.rule === existing.rule &&
        (existing.rule === 'R4' || f.blockKey === existing.blockKey) &&
        f.startOffset === existing.startOffset
      )
      
      if (!stillExists) {
        // Only resolve findings relevant to the documents we scanned!
        // Since we scanned all pages, we can safely resolve any finding that is missing.
        tx.patch(existing._id, p => p.set({ status: 'resolved', resolvedAt: new Date().toISOString() }))
        resolvedCount++
      }
    }

    // 2. Create findings that don't exist yet
    for (const finding of newFindings) {
      const alreadyExists = existingFindings.some((existing: any) => 
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

    // 3. Log the scanRun
    const duration = Date.now() - startTime
    tx.create({
      _type: 'scanRun',
      startedAt: new Date(startTime).toISOString(),
      trigger: 'webhook',
      status: 'completed',
      metrics: {
        pagesScanned: pagesToScan.length,
        factsScanned: factsToScan.length,
        findingsCreated: createdCount,
        findingsResolved: resolvedCount,
        durationMs: duration
      }
    })

    // Commit transaction if there are any mutations
    if (createdCount > 0 || resolvedCount > 0 || true) { // always commit the scanRun
      await tx.commit()
    }

    return NextResponse.json({ 
      success: true, 
      scanned: { pages: pagesToScan.length, facts: factsToScan.length },
      findings: { created: createdCount, resolved: resolvedCount },
      duration 
    })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
