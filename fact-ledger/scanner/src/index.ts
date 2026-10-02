import type { ScannerFact, ScannerFinding, ScannerPage } from './types'

// ── Portable Text Helpers ──

interface Span {
  _type: 'span'
  _key: string
  text: string
}

interface FactRef {
  _type: 'factRef'
  _key: string
  fact?: { _ref: string }
}

interface Block {
  _type: 'block'
  _key: string
  children: (Span | FactRef | any)[]
}

/** Extracts all plain text spans from a block with their relative start offsets */
export function extractTextOffsets(block: Block): { text: string; offset: number; key: string }[] {
  let currentOffset = 0
  const result: { text: string; offset: number; key: string }[] = []

  for (const child of block.children || []) {
    if (child._type === 'span' && typeof child.text === 'string') {
      result.push({ text: child.text, offset: currentOffset, key: child._key })
      currentOffset += child.text.length
    } else if (child._type === 'factRef') {
      // factRefs do not contribute to the plain text being scanned for R1/R2.
      // But we must NOT increment currentOffset, because the offset should be
      // relative to the individual span text, or we treat them as separate chunks.
      // Wait, if we want offsets for splicing, offsets are per-block.
      // But actually the Portable Text splice will need the child span key and the offset within that span.
      // Let's make the offset relative to the *span*, not the block! That's much easier for fixing.
    }
  }
  return result
}

// ── Rule 1: Unlinked Match ──
// Finds plain-text copies of a fact's value or aliases in prose.
export const R1 = {
  id: 'R1' as const,
  scan(pages: ScannerPage[], facts: ScannerFact[]): ScannerFinding[] {
    const findings: ScannerFinding[] = []
    const activeFacts = facts.filter(f => f.status === 'active')

    for (const page of pages) {
      if (!Array.isArray(page.body)) continue

      for (const block of page.body) {
        if (block._type !== 'block' || !block.children) continue

        // Check each span in the block
        for (const child of block.children) {
          if (child._type !== 'span' || typeof child.text !== 'string') continue

          const text = child.text
          
          for (const fact of activeFacts) {
            // Build the list of terms to search for
            const terms = []
            
            // Expected string: "value unit" or just "value"
            const expectedStr = [fact.value, fact.unit].filter(Boolean).join(' ')
            terms.push(expectedStr)
            
            if (fact.aliases) {
              terms.push(...fact.aliases)
            }

            // Deduplicate terms and sort by length descending to match longest first
            const uniqueTerms = Array.from(new Set(terms)).sort((a, b) => b.length - a.length)

            for (const term of uniqueTerms) {
              const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              const prefix = /^[\w]/.test(term) ? '\\b' : '(?<=^|\\s|\\W)'
              const suffix = /[\w]$/.test(term) ? '\\b' : '(?=\\s|\\W|$)'
              const regex = new RegExp(`${prefix}${escapedTerm}${suffix}`, 'gi')
              
              let match
              while ((match = regex.exec(text)) !== null) {
                const start = Math.max(0, match.index - 20)
                const end = Math.min(text.length, match.index + term.length + 20)
                const excerpt = '...' + text.slice(start, end).replace(/\n/g, ' ') + '...'

                findings.push({
                  pageId: page._id,
                  factId: fact._id,
                  rule: 'R1',
                  blockKey: block._key,
                  childKey: child._key,
                  startOffset: match.index,
                  endOffset: match.index + term.length,
                  excerpt,
                  foundValue: match[0],
                  expectedValue: expectedStr
                })
              }
            }
          }
        }
      }
    }
    // Deduplicate R1 findings on same fact+block+offset (e.g., if multiple aliases match the exact same string)
    const deduped: ScannerFinding[] = []
    const seen = new Set<string>()
    for (const f of findings) {
       const k = `${f.pageId}-${f.factId}-${f.blockKey}-${f.startOffset}`
       if (!seen.has(k)) {
          seen.add(k)
          deduped.push(f)
       }
    }
    return deduped
  }
}

// ── Rule 2: Contradiction ──
// Finds different numbers near the fact's label in prose.
export const R2 = {
  id: 'R2' as const,
  scan(pages: ScannerPage[], facts: ScannerFact[]): ScannerFinding[] {
    const findings: ScannerFinding[] = []
    const activeFacts = facts.filter(f => f.status === 'active')

    for (const page of pages) {
      if (!Array.isArray(page.body)) continue

      for (const block of page.body) {
        if (block._type !== 'block' || !block.children) continue
        
        for (const child of block.children) {
          if (child._type !== 'span' || typeof child.text !== 'string') continue
          
          const text = child.text
          
          for (const fact of activeFacts) {
            if (!fact.value.match(/^[0-9.]+$/)) continue
            
            const stopWords = new Set(['window', 'period', 'time', 'fee', 'rate', 'max', 'size', 'days', 'hours', 'years', 'payment', 'response'])
            const labelKeywords = fact.label.split(' ')
              .map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
              .filter(w => w.length > 3 && !stopWords.has(w))
              
            if (labelKeywords.length === 0) continue

            const textLower = text.toLowerCase()
            const foundKeyword = labelKeywords.find(k => textLower.includes(k))
            
            if (foundKeyword) {
              const numRegex = /\b(\d+(?:\.\d+)?)\b/g
              let match
              while ((match = numRegex.exec(text)) !== null) {
                const foundNum = match[1]
                if (foundNum !== fact.value) {
                  // Skip numbers that look like years or are too large compared to fact value
                  if (foundNum.length === 4 && foundNum.startsWith('20') && fact.value.length < 4) continue
                  if (Number(foundNum) > 1000 && Number(fact.value) <= 100) continue
                  // Skip exact matches like '30' if the rule matched '30' inside '300' (already handled by \b)
                  
                  const keywordIdx = textLower.indexOf(foundKeyword)
                  if (Math.abs(keywordIdx - match.index) <= 60) {
                     const textBetween = text.substring(Math.min(keywordIdx, match.index), Math.max(keywordIdx, match.index))
                     if (textBetween.includes('|') || textBetween.includes('.')) continue
                     
                     const start = Math.max(0, match.index - 20)
                     const end = Math.min(text.length, match.index + foundNum.length + 20)
                     const excerpt = '...' + text.slice(start, end).replace(/\n/g, ' ') + '...'

                     findings.push({
                        pageId: page._id,
                        factId: fact._id,
                        rule: 'R2',
                        blockKey: block._key,
                        childKey: child._key,
                        startOffset: match.index,
                        endOffset: match.index + foundNum.length,
                        excerpt,
                        foundValue: foundNum,
                        expectedValue: fact.value
                     })
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Deduplicate findings where both R1 and R2 might trigger?
    // Actually, R2 expects a different number, so R1 (exact match) and R2 (different number) are mutually exclusive on the exact same token.
    
    return findings
  }
}

// ── Rule 3: Deprecated Reference ──
// Finds a factRef pointing to a deprecated fact
export const R3 = {
  id: 'R3' as const,
  scan(pages: ScannerPage[], facts: ScannerFact[]): ScannerFinding[] {
    const findings: ScannerFinding[] = []
    const deprecatedIds = new Set(facts.filter(f => f.status === 'deprecated').map(f => f._id))

    for (const page of pages) {
      if (!Array.isArray(page.body)) continue

      for (const block of page.body) {
        if (block._type !== 'block' || !block.children) continue

        for (const child of block.children) {
          if (child._type === 'factRef' && child.fact && child.fact._ref) {
            const refId = child.fact._ref
            if (deprecatedIds.has(refId)) {
              findings.push({
                pageId: page._id,
                factId: refId,
                rule: 'R3',
                blockKey: block._key,
                childKey: child._key,
                excerpt: '[Deprecated Fact Reference]',
              })
            }
          }
        }
      }
    }
    return findings
  }
}

// ── Rule 4: Orphan Fact ──
// Active fact with 0 page references
export const R4 = {
  id: 'R4' as const,
  scan(pages: ScannerPage[], facts: ScannerFact[]): ScannerFinding[] {
    const findings: ScannerFinding[] = []
    const activeFacts = facts.filter(f => f.status === 'active')
    
    const referencedFactIds = new Set<string>()

    for (const page of pages) {
      if (!Array.isArray(page.body)) continue
      for (const block of page.body) {
        if (block._type !== 'block' || !block.children) continue
        for (const child of block.children) {
          if (child._type === 'factRef' && child.fact && child.fact._ref) {
            referencedFactIds.add(child.fact._ref)
          }
        }
      }
    }

    for (const fact of activeFacts) {
      if (!referencedFactIds.has(fact._id)) {
        findings.push({
          pageId: 'none', // Orphan applies to the fact, not a page
          factId: fact._id,
          rule: 'R4',
          excerpt: 'Fact has no references in any page',
        })
      }
    }
    return findings
  }
}

// ── Rule 5: Temporal Expiration ──
// Finds factRefs pointing to facts that are expired or not yet effective
export const R5 = {
  id: 'R5' as const,
  scan(pages: ScannerPage[], facts: ScannerFact[]): ScannerFinding[] {
    const findings: ScannerFinding[] = []
    const now = new Date()

    const invalidFactIds = new Set(
      facts
        .filter(f => {
          if (f.status !== 'active') return false
          const from = f.effectiveFrom ? new Date(f.effectiveFrom) : null
          const until = f.effectiveUntil ? new Date(f.effectiveUntil) : null
          if (from && from > now) return true // Not yet effective
          if (until && until < now) return true // Expired
          return false
        })
        .map(f => f._id)
    )

    for (const page of pages) {
      if (!Array.isArray(page.body)) continue

      for (const block of page.body) {
        if (block._type !== 'block' || !block.children) continue

        for (const child of block.children) {
          if (child._type === 'factRef' && child.fact && child.fact._ref) {
            const refId = child.fact._ref
            if (invalidFactIds.has(refId)) {
              findings.push({
                pageId: page._id,
                factId: refId,
                rule: 'R5',
                blockKey: block._key,
                childKey: child._key,
                excerpt: '[Temporal Bound Violation: Fact is expired or not yet effective]',
              })
            }
          }
        }
      }
    }
    return findings
  }
}

export function runScanner(pages: ScannerPage[], facts: ScannerFact[]): ScannerFinding[] {
  const rules = [R1, R2, R3, R4, R5]
  const allFindings: ScannerFinding[] = []
  
  for (const rule of rules) {
    allFindings.push(...rule.scan(pages, facts))
  }
  
  return allFindings
}
