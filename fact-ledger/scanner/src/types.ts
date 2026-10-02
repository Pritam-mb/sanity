export interface ScannerFact {
  _id: string
  label: string
  value: string
  unit?: string
  status: 'active' | 'deprecated'
  aliases?: string[]
  effectiveFrom?: string
  effectiveUntil?: string
}

export interface ScannerPage {
  _id: string
  title: string
  body: any[]
}

export interface ScannerFinding {
  pageId: string
  factId: string
  rule: 'R1' | 'R2' | 'R3' | 'R4' | 'R5'
  blockKey?: string
  childKey?: string
  startOffset?: number
  endOffset?: number
  excerpt?: string
  foundValue?: string
  expectedValue?: string
}

export interface Rule {
  id: 'R1' | 'R2' | 'R3' | 'R4' | 'R5'
  scan(pages: ScannerPage[], facts: ScannerFact[]): ScannerFinding[]
}
