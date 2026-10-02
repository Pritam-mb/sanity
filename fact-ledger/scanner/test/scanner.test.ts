import { describe, it, expect } from 'vitest'
import { R1, R2, R3, R4, runScanner, type ScannerFact, type ScannerPage } from '../src/index'

describe('Scanner Rules', () => {
  const mockFacts: ScannerFact[] = [
    { _id: 'f1', label: 'Refund Window', value: '30', unit: 'days', status: 'active', aliases: ['thirty days'] },
    { _id: 'f2', label: 'Old Refund Window', value: '60', unit: 'days', status: 'deprecated' },
    { _id: 'f3', label: 'Orphan Fact', value: '100', status: 'active' }
  ]

  it('R1: finds unlinked match in plain text', () => {
    const pages: ScannerPage[] = [{
      _id: 'p1',
      title: 'Policy',
      body: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{ _type: 'span', _key: 's1', text: 'You have 30 days to return items.' }]
        }
      ]
    }]
    
    const findings = R1.scan(pages, mockFacts)
    expect(findings).toHaveLength(1)
    expect(findings[0].rule).toBe('R1')
    expect(findings[0].foundValue).toBe('30 days')
  })

  it('R2: finds contradiction near label', () => {
    const pages: ScannerPage[] = [{
      _id: 'p1',
      title: 'Policy',
      body: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{ _type: 'span', _key: 's1', text: 'The refund window is now 60 days for all users.' }]
        }
      ]
    }]
    
    const findings = R2.scan(pages, mockFacts)
    expect(findings).toHaveLength(1)
    expect(findings[0].rule).toBe('R2')
    expect(findings[0].foundValue).toBe('60')
    expect(findings[0].expectedValue).toBe('30')
  })

  it('R3: finds deprecated reference', () => {
    const pages: ScannerPage[] = [{
      _id: 'p1',
      title: 'Policy',
      body: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{ _type: 'factRef', _key: 'fr1', fact: { _ref: 'f2' } }]
        }
      ]
    }]
    
    const findings = R3.scan(pages, mockFacts)
    expect(findings).toHaveLength(1)
    expect(findings[0].rule).toBe('R3')
    expect(findings[0].factId).toBe('f2')
  })

  it('R4: finds orphan fact', () => {
    const pages: ScannerPage[] = [{
      _id: 'p1',
      title: 'Policy',
      body: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{ _type: 'factRef', _key: 'fr1', fact: { _ref: 'f1' } }]
        }
      ]
    }]
    
    const findings = R4.scan(pages, mockFacts)
    expect(findings).toHaveLength(1)
    expect(findings[0].rule).toBe('R4')
    expect(findings[0].factId).toBe('f3')
  })
})
