import { detectAmbiguity } from '../ambiguity/detector.ts'
import type { AmbiguitySignal } from '@/types'

// =============================================
// CLAUSE COURT — DEMO DATASET
// =============================================
//
// 12 clauses, 3 of which the deterministic engine flags. Everything the app
// writes into Sanity during the demo is reachable from a cold, freshly seeded
// dataset: one fully litigated case (clause -> interpretations -> debate ->
// ruling -> precedent) and one clause that already cites that precedent, so
// the killer moment is live on first load.

export interface SeedDefinition {
  _id: string
  _type: 'definition'
  term: string
  definition: string
  category: string
}

export interface SeedClause {
  _id: string
  _type: 'clause'
  title: string
  text: string
  category: string
  caseNumber: string
  definitions: string[]
  citedPrecedent: string[]
}

export const SEED_DEFINITIONS: SeedDefinition[] = [
  {
    _id: 'def-enterprise',
    _type: 'definition',
    term: 'Enterprise',
    definition:
      'Organizations with more than 500 employees or annual revenue exceeding $10 million.',
    category: 'tier',
  },
  {
    _id: 'def-business-day',
    _type: 'definition',
    term: 'Business Day',
    definition:
      'Monday through Friday, 9:00 to 18:00 in the customer’s local timezone, excluding public holidays.',
    category: 'time',
  },
  {
    _id: 'def-eligible-user',
    _type: 'definition',
    term: 'Eligible User',
    definition:
      'A user on an active Enterprise or Professional subscription at the time the request is made.',
    category: 'entitlement',
  },
  {
    _id: 'def-force-majeure',
    _type: 'definition',
    term: 'Force Majeure',
    definition:
      'An event beyond either party’s reasonable control, including natural disaster, war, or widespread network failure.',
    category: 'other',
  },
]

export const SEED_CLAUSES: SeedClause[] = [
  // ─── FLAGGED (1 of 3) ───────────────────────────────────
  // This one is already litigated: it carries a ruling and produced the
  // precedent that clause #2 cites. It is the "institutional history" the
  // second debate inherits.
  {
    _id: 'clause-refund-policy',
    _type: 'clause',
    title: 'Refund Policy — Processing Time',
    text: 'Refund requests submitted within a reasonable time after cancellation will be considered for approval, provided the customer has not made excessive use of the service.',
    category: 'Refund Policy',
    caseNumber: '#0042',
    definitions: [],
    citedPrecedent: [],
  },

  // ─── FLAGGED (2 of 3) — the killer clause ───────────────
  // Same ambiguous term family as #0042 and it already cites that precedent.
  // Opening this clause and entering the debate is the whole demo.
  {
    _id: 'clause-service-interruption',
    _type: 'clause',
    title: 'Service Interruption Response',
    text: 'In the event of a service interruption, the company will restore services promptly and notify affected customers within a reasonable period after the interruption is identified.',
    category: 'Service Level Agreement',
    caseNumber: '#0043',
    definitions: ['def-force-majeure'],
    citedPrecedent: ['precedent-refund-reasonable-time'],
  },

  // ─── FLAGGED (3 of 3) ───────────────────────────────────
  // "Eligible" is defined and linked, so Rule B stays quiet on it.
  // "Priority" is not defined anywhere, so Rule B fires — and "when
  // appropriate" trips Rule D. Two different rules, same clause.
  {
    _id: 'clause-priority-support',
    _type: 'clause',
    title: 'Priority Support Entitlement',
    text: 'Eligible Users are entitled to priority support as determined by their subscription tier. Priority support includes faster response times and access to senior support staff when appropriate.',
    category: 'Support Policy',
    caseNumber: '#0044',
    definitions: ['def-eligible-user'],
    citedPrecedent: [],
  },

  // ─── CLEAN (the engine must stay quiet on these) ─────────
  {
    _id: 'clause-data-retention',
    _type: 'clause',
    title: 'Data Retention Period',
    text: 'User data will be retained for exactly 90 days after account deletion, after which it will be permanently and irreversibly deleted from all production systems.',
    category: 'Data Policy',
    caseNumber: '#0031',
    definitions: [],
    citedPrecedent: [],
  },
  {
    _id: 'clause-payment-terms',
    _type: 'clause',
    title: 'Payment Terms',
    text: 'All invoices are due within 30 calendar days of the invoice date. Invoices unpaid after 30 days will incur a 1.5% monthly late fee.',
    category: 'Billing',
    caseNumber: '#0032',
    definitions: [],
    citedPrecedent: [],
  },
  {
    _id: 'clause-api-rate-limit',
    _type: 'clause',
    title: 'API Rate Limiting',
    text: 'API requests are limited to 1,000 calls per hour per authenticated user. Requests exceeding this limit will receive a 429 Too Many Requests HTTP response.',
    category: 'Technical',
    caseNumber: '#0033',
    definitions: [],
    citedPrecedent: [],
  },
  {
    _id: 'clause-password-policy',
    _type: 'clause',
    title: 'Password Requirements',
    text: 'Passwords must be a minimum of 12 characters and include at least one uppercase letter, one number, and one special character. Passwords expire every 90 days.',
    category: 'Security',
    caseNumber: '#0034',
    definitions: [],
    citedPrecedent: [],
  },
  {
    _id: 'clause-sla-uptime',
    _type: 'clause',
    title: 'Uptime Guarantee',
    text: 'The service guarantees 99.9% uptime measured monthly, excluding scheduled maintenance windows which will be announced at least 48 hours in advance.',
    category: 'Service Level Agreement',
    caseNumber: '#0035',
    definitions: [],
    citedPrecedent: [],
  },
  {
    _id: 'clause-ip-ownership',
    _type: 'clause',
    title: 'Intellectual Property Ownership',
    text: 'All content created using the platform remains the sole intellectual property of the creating user. The platform receives a non-exclusive, royalty-free license to display the content within the service.',
    category: 'Legal',
    caseNumber: '#0036',
    definitions: [],
    citedPrecedent: [],
  },
  {
    _id: 'clause-termination-notice',
    _type: 'clause',
    title: 'Termination Notice Period',
    text: 'Either party may terminate this agreement with 30 days written notice. Termination for material breach requires 14 days written notice specifying the breach.',
    category: 'Legal',
    caseNumber: '#0037',
    definitions: [],
    citedPrecedent: [],
  },
  {
    _id: 'clause-geographic-restrictions',
    _type: 'clause',
    title: 'Geographic Service Availability',
    text: 'The service is available in the 50 United States, Canada, United Kingdom, and all European Union member states. Service outside these regions is not supported and may be terminated without notice.',
    category: 'Compliance',
    caseNumber: '#0038',
    definitions: [],
    citedPrecedent: [],
  },
  {
    // Uses "Business Days" while the definition document defines
    // "Business Day" and is linked here. Rule B must stay silent, which is
    // what proves the rule can be satisfied rather than only fired.
    _id: 'clause-support-sla',
    _type: 'clause',
    title: 'Support Response Commitment',
    text: 'First response to a support ticket must be delivered within 1 Business Day of ticket creation. Support is available Monday to Friday, excluding public holidays.',
    category: 'Support Policy',
    caseNumber: '#0040',
    definitions: ['def-business-day'],
    citedPrecedent: [],
  },
]

// =============================================
// THE SEEDED LITIGATION
// =============================================
//
// A complete, human-ruled case. These documents are hand-authored rather than
// generated so the demo opens on a real holding rather than a mock one.

export interface SeedInterpretation {
  _id: string
  _type: 'interpretation'
  side: 'A' | 'B'
  clause: string
  title: string
  summary: string
  argument: string
  textualEvidence: string[]
  citedPrecedent: string[]
}

export const SEED_INTERPRETATIONS: SeedInterpretation[] = [
  {
    _id: 'interp-refund-a',
    _type: 'interpretation',
    side: 'A',
    clause: 'clause-refund-policy',
    title: 'Meaningful Period for a Normal Customer',
    summary:
      'A reasonable time is however long a person who did not read the cancellation email would still think the door was open.',
    argument:
      'The clause says a refund "will be considered for approval", not that it "may be refused". The operative verb is permissive in form but mandatory in effect: once a request falls inside the window, the company owes a decision. Nothing in the sentence gives the company a second, shorter window that is not disclosed.\n\n"Reasonable time" should therefore be read against the party the clause protects. A customer who cancels has, in most consumer settings, a statutory or reputational expectation that the credit note can still be issued. A period that expires before an ordinary person thinks to ask is not a period the word "reasonable" describes. The defensible reading is a period measured from the customer’s decision, wide enough that an ordinary user acting in good faith lands inside it.\n\nThe second sentence — "provided the customer has not made excessive use" — reinforces this reading. It is a carve-out, not a second time limit. A carve-out implies the default applies unless the exception bites, and the exception here is about conduct, not timing. So the timing question is decided solely by "reasonable time", and it should be decided generously enough to be discoverable.',
    textualEvidence: [
      'within a reasonable time after cancellation',
      'will be considered for approval',
      'provided the customer has not made excessive use of the service',
    ],
    citedPrecedent: [],
  },
  {
    _id: 'interp-refund-b',
    _type: 'interpretation',
    side: 'B',
    clause: 'clause-refund-policy',
    title: 'Operational Processing Window',
    summary:
      'A reasonable time is the short window the company can actually service a refund inside, not an indefinite grace period.',
    argument:
      'The clause is a refund policy, not a statute, and it operates inside an accounting process. Refunds move through a ledger, a payment processor, and a revenue-recognition cycle. A window that is open indefinitely is not a window at all — it is an open-ended liability that the company cannot price, reserve for, or staff.\n\n"Reasonable" in operational drafting almost always qualifies the company’s conduct rather than the customer’s intentions. It is the company that is expected to act reasonably. Read this way, the phrase sets the standard the company must meet in handling the request, and the natural benchmark is the company’s own normal processing period, subject to operational constraints.\n\nThe word "considered" is doing quiet work in the first advocate’s reading. To say a request "will be considered for approval" is to describe an intake step, not an entitlement. The company can consider a request and decline it. On that reading the customer has no expectation to protect, and the phrase "reasonable time" is left to be defined operationally — otherwise every refund dispute becomes a good-faith argument about what is reasonable, which is precisely the ambiguity the clause should avoid.',
    textualEvidence: [
      'will be considered for approval',
      'within a reasonable time after cancellation',
      'provided the customer has not made excessive use of the service',
    ],
    citedPrecedent: [],
  },
]

export const SEED_RULING = {
  _id: 'ruling-refund-reasonable-time',
  _type: 'ruling' as const,
  clause: 'clause-refund-policy',
  judgeName: 'Priya Raman',
  chosenInterpretation: null,
  customRuling:
    'For this policy, "reasonable time" means 30 calendar days from the date of cancellation. Beyond 30 days a request is not considered.',
  reasoning:
    'A calendar figure is checkable, which is what a policy needs. I am not adopting Advocate A or Advocate B wholesale: A is right that the window is measured from the customer’s cancellation, and B is right that the window has to be finite. 30 days satisfies both. "Excessive use" remains undefined and is flagged separately.',
  dissent:
    'Advocate B notes that a 30-day window requires the ledger to stay open for a full billing cycle and will slow revenue recognition for late refunds. Advocate B further observes that "excessive use" is still undefined, so the company retains an unbounded discretion on the one term that most often decides contested refunds, and recommends that clause language be revised to define it numerically before this policy is relied on at volume.',
  dissentAdvocate: 'B' as const,
  clauseRevisionSuggested: true,
  suggestedRevision:
    'Refund requests submitted within 30 calendar days after cancellation will be considered for approval, provided average daily usage during the billing period did not exceed 1.5× the plan’s included allowance.',
}

export const SEED_PRECEDENT = {
  _id: 'precedent-refund-reasonable-time',
  _type: 'precedent' as const,
  ruling: 'ruling-refund-reasonable-time',
  sourceClause: 'clause-refund-policy',
  title: 'Reasonable Time in Refund Policy',
  holding: '30 calendar days from the date of cancellation.',
  reasoning:
    'A vague quantifier in a policy that a customer must act on has to be a number, and it has to be measured from something the customer can see. "From the date of cancellation" is that anchor.',
  applicableTerms: ['reasonable', 'time', 'excessive', 'use'],
  citesPrecedent: [],
  relevanceScore: 100,
  citationCount: 1,
}

// =============================================
// SEED EXECUTION
// =============================================

export const SEED_DOCUMENT_TYPES = [
  'clause',
  'interpretation',
  'debate',
  'ruling',
  'precedent',
  'definition',
] as const

export interface SeedPlanEntry {
  _id: string
  _type: string
  status?: string
  signals?: AmbiguitySignal[]
}

/**
 * Compute the deterministic ambiguity report for a seeded clause, given the
 * definitions linked to it. The engine runs here, at seed time, so the very
 * first page load already shows real signals — the dashboard never has to wait
 * for someone to open a clause before it can say "3 need review".
 */
export function planSeedClauses(
  definitions: SeedDefinition[] = SEED_DEFINITIONS,
  clauses: SeedClause[] = SEED_CLAUSES
): SeedPlanEntry[] {
  const byId = new Map(definitions.map((d) => [d._id, d]))

  return clauses.map((clause) => {
    const linked = clause.definitions
      .map((id) => byId.get(id))
      .filter((d): d is SeedDefinition => Boolean(d))
      .map((d) => ({ term: d.term }))

    const report = detectAmbiguity(clause.text, linked)
    const alreadyRuled = clause._id === 'clause-refund-policy'

    return {
      _id: clause._id,
      _type: 'clause',
      // draft -> flagged is the only transition the engine may make on its
      // own. A clause the engine clears simply stays in draft.
      status: report.flagged ? (alreadyRuled ? 'ruled' : 'flagged') : 'draft',
      signals: report.signals,
    }
  })
}
