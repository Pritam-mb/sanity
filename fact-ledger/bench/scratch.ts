import { R2 } from '@fact-ledger/scanner'

const pages = [
  {
    _id: 'page-ho-cancellation',
    title: 'Cancellation Policy',
    body: [
      {
        _type: 'block',
        _key: 'b3',
        children: [
          {
            _type: 'span',
            _key: 's1',
            text: 'Customers who joined under our legacy plan had a 60 days refund eligibility window, which has since changed.'
          }
        ]
      }
    ]
  }
]

const facts = [
  {
    _id: 'fact-refund-window-days',
    label: 'Refund Window',
    value: '30',
    status: 'active' as const
  }
]

const findings = R2.scan(pages, facts)
console.log(JSON.stringify(findings, null, 2))
