export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import crypto from 'crypto'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

export async function POST(req: Request) {
  try {
    // 1. Fetch all OPEN findings
    const findings = await client.fetch(`*[_type == "finding" && status == "open"]{
      _id, pageId, factId, rule, blockKey, childKey, startOffset, endOffset, foundValue
    }`)
    
    if (findings.length === 0) {
      return NextResponse.json({ message: 'No open findings to remediate' }, { status: 200 })
    }

    // 2. We need the actual pages to get the beforeText and to generate mutations
    const pageIds = Array.from(new Set(findings.map((f: any) => f.pageId)))
    const pages = await client.fetch<any[]>(`*[_type == "page" && _id in $pageIds]`, { pageIds })
    
    const pageMap = new Map(pages.map((p: any) => [p._id, p]))

    const fixes = []

    for (const finding of findings) {
      const page = pageMap.get(finding.pageId)
      if (!page) continue
      
      const block = ((page as any).body || []).find((b: any) => b._key === finding.blockKey)
      if (!block) continue
      
      const child = (block.children || []).find((c: any) => c._key === finding.childKey)
      if (!child || child._type !== 'span') continue

      // Calculate Before and After text
      const beforeText = child.text
      const beforePrefix = child.text.substring(0, finding.startOffset)
      const beforeSuffix = child.text.substring(finding.endOffset)
      
      const afterText = `${beforePrefix}[FACT_REF:${finding.factId}]${beforeSuffix}`

      // Create the proposed mutation
      // We will replace the single child span with an array of 3 children: [prefixSpan, factRef, suffixSpan]
      // Wait, Sanity's patch API allows `insert` and `replace`.
      // The path to this child is `body[_key=="${block._key}"].children[_key=="${child._key}"]`
      // But we can't easily replace one item with THREE items in a single Sanity patch step natively unless we use `insert` and `unset`.
      // Actually, we can just replace the ENTIRE `children` array of the block!
      
      const childIndex = block.children.findIndex((c: any) => c._key === finding.childKey)
      const newChildren = [...block.children]
      
      const replacementChildren = []
      if (beforePrefix) {
        replacementChildren.push({
          _type: 'span',
          _key: crypto.randomUUID(),
          text: beforePrefix,
          marks: child.marks || []
        })
      }
      
      replacementChildren.push({
        _type: 'factRef',
        _key: crypto.randomUUID(),
        fact: { _type: 'reference', _ref: finding.factId }
      })
      
      if (beforeSuffix) {
        replacementChildren.push({
          _type: 'span',
          _key: crypto.randomUUID(),
          text: beforeSuffix,
          marks: child.marks || []
        })
      }
      
      newChildren.splice(childIndex, 1, ...replacementChildren)
      
      const mutation = {
        patch: {
          id: (page as any)._id,
          set: {
            [`body[_key=="${block._key}"].children`]: newChildren
          }
        }
      }

      fixes.push({
        _key: crypto.randomUUID(),
        finding: { _type: 'reference', _ref: finding._id },
        page: { _type: 'reference', _ref: (page as any)._id },
        blockKey: finding.blockKey,
        childKey: finding.childKey,
        beforeText,
        afterText,
        mutation: JSON.stringify(mutation),
        approved: true
      })
    }

    // 3. Create the Remediation document
    if (fixes.length > 0) {
      const tx = client.transaction()
      
      const remediationId = crypto.randomUUID()
      tx.create({
        _type: 'remediation',
        _id: remediationId,
        status: 'draft',
        fixes
      })
      
      // Audit Log: fix_drafted
      tx.create({
        _type: 'changeEvent',
        actor: 'AI Agent',
        action: 'fix_drafted',
        at: new Date().toISOString(),
        releaseId: remediationId,
        after: JSON.stringify({ fixesCount: fixes.length })
      })

      await tx.commit()
      
      return NextResponse.json({ 
        success: true, 
        message: `Created remediation ${remediationId} with ${fixes.length} fixes`,
        remediationId: remediationId
      })
    }
    
    return NextResponse.json({ message: 'No valid fixes could be generated' }, { status: 200 })

  } catch (error: any) {
    console.error('Agent Remediate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
