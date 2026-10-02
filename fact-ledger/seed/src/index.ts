/**
 * Fact Ledger — idempotent seed script
 *
 * Uses `createOrReplace` with deterministic document IDs throughout.
 * Running this twice produces the same dataset (idempotency requirement).
 *
 * Dataset layout:
 *   People    : 2
 *   Facts     : 7 active + 1 deprecated (fact-old-refund-window)
 *   Dev pages : 15 pages, ~21 planted issues
 *   Holdout   : 8 pages,  ~9 planted issues  (different style, held out during tuning)
 *
 * Planted issues are only in prose OUTSIDE factRef nodes (R1/R2) or are
 * factRef nodes pointing to a deprecated fact (R3).
 * fact-data-retention-years has zero page references → R4 orphan.
 *
 * Realistic traps (true negatives):
 *   - "within 30 days of purchase" on page-getting-started adjacent to an
 *     unrelated "30-day warranty" — same number, different topic.
 *   - Numbers inside a markdown-style table on page-product-limits.
 *   - "30 days" used correctly as a factRef (should NOT fire R1).
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../web/.env.local') })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// ─── Portable Text helpers ──────────────────────────────────────────────────

interface Span {
  _type: 'span'
  _key: string
  text: string
  marks: string[]
}

interface FactRefNode {
  _type: 'factRef'
  _key: string
  fact: { _type: 'reference'; _ref: string }
}

interface Block {
  _type: 'block'
  _key: string
  style: string
  children: (Span | FactRefNode)[]
  markDefs: unknown[]
}

const span = (key: string, text: string): Span => ({
  _type: 'span', _key: key, text, marks: [],
})

const ref = (key: string, factId: string): FactRefNode => ({
  _type: 'factRef', _key: key,
  fact: { _type: 'reference', _ref: factId },
})

const block = (key: string, style: string, ...children: (Span | FactRefNode)[]): Block => ({
  _type: 'block', _key: key, style, children, markDefs: [],
})

const p = (key: string, ...children: (Span | FactRefNode)[]): Block =>
  block(key, 'normal', ...children)

const h2 = (key: string, text: string): Block =>
  block(key, 'h2', span(`${key}s`, text))

// ─── Fact IDs ───────────────────────────────────────────────────────────────

const F = {
  refund:    'fact-refund-window-days',
  sla:       'fact-sla-uptime-pct',
  fileSize:  'fact-max-file-size-mb',
  trial:     'fact-free-trial-days',
  lateFee:   'fact-late-fee-pct',
  support:   'fact-support-response-hours',
  retention: 'fact-data-retention-years',   // R4 orphan — no page references it
  oldRefund: 'fact-old-refund-window',      // deprecated — for R3
}

// ─── Ground truth accumulator ────────────────────────────────────────────────

interface GroundTruthEntry {
  dataset: 'dev' | 'holdout'
  pageId: string
  blockKey: string
  factId: string
  rule: 'R1' | 'R2' | 'R3' | 'R4'
  plantedText: string   // excerpt that should be matched
  note?: string
}

const groundTruth: GroundTruthEntry[] = []

const gt = (
  dataset: 'dev' | 'holdout',
  pageId: string,
  blockKey: string,
  factId: string,
  rule: 'R1' | 'R2' | 'R3' | 'R4',
  plantedText: string,
  note?: string,
) => groundTruth.push({ dataset, pageId, blockKey, factId, rule, plantedText, note })

// ─── Documents ──────────────────────────────────────────────────────────────

const docs: unknown[] = []
const doc = (d: object) => docs.push(d)

// ── People ──────────────────────────────────────────────────────────────────
doc({ _id: 'person-alice', _type: 'person', name: 'Alice Chen', email: 'alice@example.com', role: 'Legal Counsel' })
doc({ _id: 'person-bob',   _type: 'person', name: 'Bob Patel',  email: 'bob@example.com',  role: 'Operations Lead' })

// ── Facts (active) ──────────────────────────────────────────────────────────
doc({
  _id: F.refund, _type: 'fact',
  key: { _type: 'slug', current: 'refund_window_days' },
  label: 'Refund Window',
  value: '30', unit: 'days',
  aliases: ['30 days', 'thirty days', 'thirty (30) days', 'one month'],
  owner: { _type: 'reference', _ref: 'person-alice' },
  effectiveFrom: '2024-01-01',
  status: 'active',
})
doc({
  _id: F.sla, _type: 'fact',
  key: { _type: 'slug', current: 'sla_uptime_pct' },
  label: 'SLA Uptime',
  value: '99.9', unit: '%',
  aliases: ['99.9%', '99.9 percent', 'ninety-nine point nine percent'],
  owner: { _type: 'reference', _ref: 'person-bob' },
  effectiveFrom: '2024-01-01',
  status: 'active',
})
doc({
  _id: F.fileSize, _type: 'fact',
  key: { _type: 'slug', current: 'max_file_size_mb' },
  label: 'Max File Size',
  value: '100', unit: 'MB',
  aliases: ['100 MB', '100 megabytes', 'one hundred megabytes', '100MB'],
  owner: { _type: 'reference', _ref: 'person-bob' },
  effectiveFrom: '2024-01-01',
  status: 'active',
})
doc({
  _id: F.trial, _type: 'fact',
  key: { _type: 'slug', current: 'free_trial_days' },
  label: 'Free Trial Period',
  value: '14', unit: 'days',
  aliases: ['14 days', 'fourteen days', 'two weeks'],
  owner: { _type: 'reference', _ref: 'person-alice' },
  effectiveFrom: '2024-01-01',
  status: 'active',
})
doc({
  _id: F.lateFee, _type: 'fact',
  key: { _type: 'slug', current: 'late_fee_pct' },
  label: 'Late Payment Fee',
  value: '1.5', unit: '%',
  aliases: ['1.5%', '1.5 percent', 'one point five percent', '1.5% per month'],
  owner: { _type: 'reference', _ref: 'person-alice' },
  effectiveFrom: '2024-01-01',
  status: 'active',
})
doc({
  _id: F.support, _type: 'fact',
  key: { _type: 'slug', current: 'support_response_hours' },
  label: 'Support Response Time',
  value: '24', unit: 'hours',
  aliases: ['24 hours', 'twenty-four hours', '24-hour', 'one business day'],
  owner: { _type: 'reference', _ref: 'person-bob' },
  effectiveFrom: '2024-01-01',
  status: 'active',
})
doc({
  _id: F.retention, _type: 'fact',
  key: { _type: 'slug', current: 'data_retention_years' },
  label: 'Data Retention Period',
  value: '7', unit: 'years',
  aliases: ['7 years', 'seven years'],
  owner: { _type: 'reference', _ref: 'person-alice' },
  effectiveFrom: '2024-01-01',
  status: 'active',
  // No page will reference this → R4 orphan
})

// ── Deprecated fact (for R3 tests) ──────────────────────────────────────────
doc({
  _id: F.oldRefund, _type: 'fact',
  key: { _type: 'slug', current: 'old_refund_window' },
  label: 'Refund Window (Legacy)',
  value: '60', unit: 'days',
  aliases: ['60 days', 'sixty days'],
  status: 'deprecated',
})

// ═══════════════════════════════════════════════════════════════════════════
// DEV PAGES (15)
// ═══════════════════════════════════════════════════════════════════════════

// ── 1. Returns Policy ───────────────────────────────────────────────────────
// R1: "30 days" plain text in b2 (the first block uses factRef correctly)
{
  const id = 'page-returns-policy'
  doc({
    _id: id, _type: 'page',
    title: 'Returns Policy',
    slug: { _type: 'slug', current: 'returns-policy' },
    kind: 'policy',
    body: [
      h2('b1', 'Our Return Policy'),
      p('b2',
        span('s1', 'You may return any item within '),
        ref('fr1', F.refund),
        span('s2', ' of purchase for a full refund.'),
      ),
      p('b3',                                              // ← R1 planted
        span('s1', 'Exchanges must also be requested within 30 days of the original order date.'),
      ),
      p('b4',
        span('s1', 'Items must be in original condition and packaging. Valid for users on the '),
        ref('fr2', F.trial),
        span('s2', ' plan or with files under '),
        ref('fr3', F.fileSize),
        span('s3', '. Support replies in '),
        ref('fr4', F.support),
        span('s4', ' and late fees are '),
        ref('fr5', F.lateFee),
        span('s5', '.'),
      ),
    ],
  })
  gt('dev', id, 'b3', F.refund, 'R1', '30 days', 'plain "30 days" outside factRef')
}

// ── 2. FAQ — Refunds ────────────────────────────────────────────────────────
// R1: "thirty (30) days" in b2; R2: "60 days" near "refund" in b3
{
  const id = 'page-faq-refunds'
  doc({
    _id: id, _type: 'page',
    title: 'FAQ — Refunds',
    slug: { _type: 'slug', current: 'faq-refunds' },
    kind: 'faq',
    body: [
      h2('b1', 'How long do I have to request a refund?'),
      p('b2',                                              // ← R1: number-word alias
        span('s1', 'Our standard refund policy allows returns within thirty (30) days of delivery.'),
      ),
      p('b3',                                              // ← R2: wrong number near label
        span('s1', 'Some legacy orders placed before 2023 may have been subject to a 60-day refund window, which no longer applies.'),
      ),
      p('b4',
        span('s1', 'Contact support to begin your return.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.refund, 'R1', 'thirty (30) days', 'number-word alias')
  gt('dev', id, 'b3', F.refund, 'R2', '60-day refund window', 'contradicting value near label "refund"')
}

// ── 3. Pricing Page ─────────────────────────────────────────────────────────
// R1: "99.9%" plain text in b3
{
  const id = 'page-pricing'
  doc({
    _id: id, _type: 'page',
    title: 'Pricing',
    slug: { _type: 'slug', current: 'pricing' },
    kind: 'pricing',
    body: [
      h2('b1', 'Plans & Pricing'),
      p('b2',
        span('s1', 'All plans include our '),
        ref('fr1', F.sla),
        span('s2', ' uptime SLA.'),
      ),
      p('b3',                                              // ← R1
        span('s1', 'Enterprise customers also receive our 99.9% availability commitment in writing.'),
      ),
      p('b4',
        span('s1', 'See our terms of service for full details.'),
      ),
    ],
  })
  gt('dev', id, 'b3', F.sla, 'R1', '99.9%', 'SLA value copied as plain text')
}

// ── 4. Help — Uploads ───────────────────────────────────────────────────────
// R1: "100 MB" in b2
{
  const id = 'page-help-uploads'
  doc({
    _id: id, _type: 'page',
    title: 'Uploading Files',
    slug: { _type: 'slug', current: 'help-uploads' },
    kind: 'help',
    body: [
      h2('b1', 'File Size Limits'),
      p('b2',                                              // ← R1
        span('s1', 'Individual files must not exceed 100 MB. Larger files must be split before uploading.'),
      ),
      p('b3',
        span('s1', 'Supported formats: PDF, DOCX, XLSX, PNG, JPG.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.fileSize, 'R1', '100 MB', 'file size limit copied as plain text')
}

// ── 5. Trial Terms ──────────────────────────────────────────────────────────
// R1: "14 days" in b2
{
  const id = 'page-trial-terms'
  doc({
    _id: id, _type: 'page',
    title: 'Free Trial Terms',
    slug: { _type: 'slug', current: 'trial-terms' },
    kind: 'policy',
    body: [
      h2('b1', 'Free Trial'),
      p('b2',                                              // ← R1
        span('s1', 'New accounts receive a complimentary 14 days trial with full access to all features.'),
      ),
      p('b3',
        span('s1', 'No credit card required during the trial period.'),
      ),
      p('b4',
        span('s1', 'At the end of your trial, your account will be downgraded unless you subscribe.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.trial, 'R1', '14 days', 'trial period copied as plain text')
}

// ── 6. Late Payment Policy ──────────────────────────────────────────────────
// R1: "1.5%" in b2; R2: "2%" near "late fee" in b3
{
  const id = 'page-late-payment'
  doc({
    _id: id, _type: 'page',
    title: 'Late Payment Policy',
    slug: { _type: 'slug', current: 'late-payment' },
    kind: 'policy',
    body: [
      h2('b1', 'Late Payment Charges'),
      p('b2',                                              // ← R1
        span('s1', 'Overdue invoices are subject to a late fee of 1.5% per month on the outstanding balance.'),
      ),
      p('b3',                                              // ← R2: wrong value near label
        span('s1', 'Prior to July 2023, our late payment fee was 2% monthly. This rate has since been reduced.'),
      ),
      p('b4',
        span('s1', 'Fees are applied automatically on the 30th day past the due date.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.lateFee, 'R1', '1.5%', 'late fee rate copied as plain text')
  gt('dev', id, 'b3', F.lateFee, 'R2', '2% monthly', 'contradicting late fee value')
}

// ── 7. Support SLA ──────────────────────────────────────────────────────────
// R1: "24 hours" in b2; R3: deprecated factRef in b4
{
  const id = 'page-support-sla'
  doc({
    _id: id, _type: 'page',
    title: 'Support Response SLA',
    slug: { _type: 'slug', current: 'support-sla' },
    kind: 'policy',
    body: [
      h2('b1', 'Support Response Times'),
      p('b2',                                              // ← R1
        span('s1', 'We guarantee a first response within 24 hours for all standard support tickets.'),
      ),
      p('b3',
        span('s1', 'Priority support customers receive responses within four hours.'),
      ),
      p('b4',                                             // ← R3: deprecated factRef
        span('s1', 'Legacy refund window for orders placed before 2023 was '),
        ref('fr1', F.oldRefund),                          // references deprecated fact
        span('s2', '.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.support, 'R1', '24 hours', 'support response time copied as plain text')
  gt('dev', id, 'b4', F.oldRefund, 'R3', 'factRef to deprecated fact-old-refund-window', 'deprecated factRef')
}

// ── 8. FAQ — Upload Limit ────────────────────────────────────────────────────
// R1: "one hundred megabytes" (word form) in b2
{
  const id = 'page-faq-upload-limit'
  doc({
    _id: id, _type: 'page',
    title: 'FAQ — Upload Limits',
    slug: { _type: 'slug', current: 'faq-upload-limit' },
    kind: 'faq',
    body: [
      h2('b1', 'What is the maximum file size?'),
      p('b2',                                              // ← R1: word-form alias
        span('s1', 'You can upload files up to one hundred megabytes in size. This limit applies per file, not per upload session.'),
      ),
      p('b3',
        span('s1', 'For larger files, please use our bulk import tool.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.fileSize, 'R1', 'one hundred megabytes', 'word-form alias for file size')
}

// ── 9. Onboarding Guide ─────────────────────────────────────────────────────
// R1: "two weeks" (b2), R1: "twenty-four hours" (b3)
{
  const id = 'page-onboarding'
  doc({
    _id: id, _type: 'page',
    title: 'Getting Started Guide',
    slug: { _type: 'slug', current: 'onboarding' },
    kind: 'help',
    body: [
      h2('b1', 'Welcome to the Platform'),
      p('b2',                                              // ← R1: word-form for trial
        span('s1', 'Your account includes a free trial for two weeks, giving you full access to explore all features.'),
      ),
      p('b3',                                              // ← R1: word-form for support
        span('s1', 'Our team is available around the clock. Expect a response within twenty-four hours on any day of the week.'),
      ),
      p('b4',
        span('s1', 'After your trial, choose a plan that fits your needs.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.trial,   'R1', 'two weeks',       'word-form alias for trial period')
  gt('dev', id, 'b3', F.support, 'R1', 'twenty-four hours', 'word-form alias for support hours')
}

// ── 10. Billing FAQ ──────────────────────────────────────────────────────────
// R1: "one point five percent" (b2)
{
  const id = 'page-billing-faq'
  doc({
    _id: id, _type: 'page',
    title: 'Billing FAQ',
    slug: { _type: 'slug', current: 'billing-faq' },
    kind: 'faq',
    body: [
      h2('b1', 'What happens if I miss a payment?'),
      p('b2',                                              // ← R1: word-form for late fee
        span('s1', 'A late fee of one point five percent is applied to any balance unpaid after four weeks.'),
      ),
      p('b3',
        span('s1', 'We send reminders at 7, 14, and 21 days past the due date.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.lateFee, 'R1', 'one point five percent', 'word-form alias for late fee')
}

// ── 11. Uptime Commitment ───────────────────────────────────────────────────
// R1: "99.9 percent" (b2); R2: "99.5%" near "uptime" (b3)
{
  const id = 'page-uptime-commitment'
  doc({
    _id: id, _type: 'page',
    title: 'Uptime Commitment',
    slug: { _type: 'slug', current: 'uptime-commitment' },
    kind: 'policy',
    body: [
      h2('b1', 'Our Uptime Guarantee'),
      p('b2',                                              // ← R1
        span('s1', 'We are committed to maintaining 99.9 percent uptime across all services.'),
      ),
      p('b3',                                              // ← R2: different number near label
        span('s1', 'In 2022, our actual uptime measurement reached 99.5% — below our current SLA commitment.'),
      ),
      p('b4',
        span('s1', 'Credits are issued automatically when SLA targets are not met.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.sla, 'R1', '99.9 percent', 'SLA alias with word "percent"')
  gt('dev', id, 'b3', F.sla, 'R2', '99.5%',         'contradicting SLA value near "uptime"')
}

// ── 12. Getting Started ──────────────────────────────────────────────────────
// R1: "30 days" in b2
// TRUE NEGATIVE TRAP: "within 30 days of purchase" near "30-day warranty" — same
// number but the "30-day warranty" in b3 is unrelated to the refund fact (different topic)
// Scanner must not double-count or confuse contexts.
{
  const id = 'page-getting-started'
  doc({
    _id: id, _type: 'page',
    title: 'Getting Started',
    slug: { _type: 'slug', current: 'getting-started' },
    kind: 'help',
    body: [
      h2('b1', 'Quick Start'),
      p('b2',                                              // ← R1: genuine match
        span('s1', 'If you are not satisfied, you may request a refund within 30 days of your first payment.'),
      ),
      p('b3',                                              // ← TRAP: "30-day" in different context
        span('s1', 'Hardware accessories sold separately come with a 30-day manufacturer warranty — separate from our digital refund policy.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.refund, 'R1', '30 days', 'refund window copied as plain text')
  // b3 is a TRUE NEGATIVE — "30-day" refers to a hardware warranty, not the refund_window fact
}

// ── 13. Enterprise Agreement ─────────────────────────────────────────────────
// R1: "one month" (refund alias) in b2; R1: "14 days" (trial) in b3
{
  const id = 'page-enterprise-agreement'
  doc({
    _id: id, _type: 'page',
    title: 'Enterprise Agreement',
    slug: { _type: 'slug', current: 'enterprise-agreement' },
    kind: 'policy',
    body: [
      h2('b1', 'Enterprise Terms'),
      p('b2',                                              // ← R1: "one month" alias
        span('s1', 'Enterprise customers may cancel with one month written notice and receive a pro-rated refund.'),
      ),
      p('b3',                                              // ← R1: trial period
        span('s1', 'A proof-of-concept period of 14 days is available for enterprise evaluations upon request.'),
      ),
      p('b4',
        span('s1', 'All enterprise contracts require legal review before signing.'),
      ),
    ],
  })
  gt('dev', id, 'b2', F.refund, 'R1', 'one month', '"one month" alias for refund window')
  gt('dev', id, 'b3', F.trial,  'R1', '14 days',   'trial period copied as plain text')
}

// ── 14. Terms of Service ─────────────────────────────────────────────────────
// R1: "30 days" in b3 (b2 uses factRef correctly — this page is partially linked)
{
  const id = 'page-terms-of-service'
  doc({
    _id: id, _type: 'page',
    title: 'Terms of Service',
    slug: { _type: 'slug', current: 'terms-of-service' },
    kind: 'policy',
    body: [
      h2('b1', 'Refunds and Cancellations'),
      p('b2',
        span('s1', 'The standard refund window is '),
        ref('fr1', F.refund),                             // ← CORRECT factRef (no finding)
        span('s2', ' from date of purchase.'),
      ),
      p('b3',                                             // ← R1: duplicate in same doc
        span('s1', 'Cancellation requests submitted more than 30 days after purchase will not qualify for a refund.'),
      ),
      p('b4',
        span('s1', 'These terms are governed by the laws of the State of California.'),
      ),
    ],
  })
  gt('dev', id, 'b3', F.refund, 'R1', '30 days', 'same doc has correct factRef + plain copy')
}

// ── 15. Product Limits ───────────────────────────────────────────────────────
// R1: "100 MB" inside a table-style block (trap: scanner must still catch it)
{
  const id = 'page-product-limits'
  doc({
    _id: id, _type: 'page',
    title: 'Product Limits',
    slug: { _type: 'slug', current: 'product-limits' },
    kind: 'help',
    body: [
      h2('b1', 'Platform Limits'),
      p('b2',
        span('s1', 'The following limits apply to all accounts:'),
      ),
      p('b3',                                             // ← R1: "100 MB" inside table-style prose
        span('s1', 'Max file size: 100 MB | Max users: 50 | Max projects: 10'),
      ),
      p('b4',
        span('s1', 'Contact sales for higher limits.'),
      ),
    ],
  })
  gt('dev', id, 'b3', F.fileSize, 'R1', '100 MB', 'file size in pipe-separated table prose')
}

// ═══════════════════════════════════════════════════════════════════════════
// HOLDOUT PAGES (8) — different style, not seen during rule tuning
// ═══════════════════════════════════════════════════════════════════════════

// ── H1. Vendor Terms ────────────────────────────────────────────────────────
// R1: "thirty days" (b2)
{
  const id = 'page-ho-vendor-terms'
  doc({
    _id: id, _type: 'page',
    title: 'Vendor Terms and Conditions',
    slug: { _type: 'slug', current: 'ho-vendor-terms' },
    kind: 'policy',
    body: [
      h2('b1', 'Returns and Disputes'),
      p('b2',                                             // ← R1 (word form, no parenthetical)
        span('s1', 'Disputes regarding delivered goods must be raised within thirty days of the invoice date.'),
      ),
      p('b3',
        span('s1', 'All disputes are subject to binding arbitration under applicable law.'),
      ),
    ],
  })
  gt('holdout', id, 'b2', F.refund, 'R1', 'thirty days', 'word-form alias, different doc style')
}

// ── H2. Partner FAQ ──────────────────────────────────────────────────────────
// R1: "ninety-nine point nine percent" (b2)
{
  const id = 'page-ho-partner-faq'
  doc({
    _id: id, _type: 'page',
    title: 'Partner Program FAQ',
    slug: { _type: 'slug', current: 'ho-partner-faq' },
    kind: 'faq',
    body: [
      h2('b1', 'Infrastructure Reliability'),
      p('b2',                                             // ← R1: long word form
        span('s1', 'Partners can assure customers of ninety-nine point nine percent availability as per our published commitments.'),
      ),
    ],
  })
  gt('holdout', id, 'b2', F.sla, 'R1', 'ninety-nine point nine percent', 'hyphenated word form in partner doc')
}

// ── H3. Reseller Agreement ───────────────────────────────────────────────────
// R1: "14 days" (b2); R2: "30 days" near "refund" context (b3)
{
  const id = 'page-ho-reseller'
  doc({
    _id: id, _type: 'page',
    title: 'Reseller Agreement',
    slug: { _type: 'slug', current: 'ho-reseller' },
    kind: 'policy',
    body: [
      h2('b1', 'Evaluation Period'),
      p('b2',                                             // ← R1: trial period
        span('s1', 'Resellers are entitled to a 14 days evaluation licence for demonstration purposes.'),
      ),
      p('b3',
        span('s1', 'End-customer refund requests must be logged within 45 days; however, the actual refund window authorised to customers is now shorter than this processing window.'),
      ),
    ],
  })
  gt('holdout', id, 'b2', F.trial,  'R1', '14 days', 'trial period in reseller doc')
  gt('holdout', id, 'b3', F.refund, 'R2', '45 days',  'old refund window value near "refund"')
}

// ── H4. Data Policy ──────────────────────────────────────────────────────────
// R1: "100 megabytes" (b2)
{
  const id = 'page-ho-data-policy'
  doc({
    _id: id, _type: 'page',
    title: 'Data Handling Policy',
    slug: { _type: 'slug', current: 'ho-data-policy' },
    kind: 'policy',
    body: [
      h2('b1', 'Storage Limits'),
      p('b2',                                             // ← R1: "megabytes" not "MB"
        span('s1', 'Uploaded attachments are capped at 100 megabytes per file to ensure system performance.'),
      ),
      p('b3',
        span('s1', 'Data retained by the platform is subject to our privacy notice.'),
      ),
    ],
  })
  gt('holdout', id, 'b2', F.fileSize, 'R1', '100 megabytes', 'alternative unit spelling in data policy')
}

// ── H5. Security Policy ───────────────────────────────────────────────────────
// R1: "24-hour" (b2) — hyphenated alias form
{
  const id = 'page-ho-security'
  doc({
    _id: id, _type: 'page',
    title: 'Security Incident Response',
    slug: { _type: 'slug', current: 'ho-security' },
    kind: 'policy',
    body: [
      h2('b1', 'Response Commitments'),
      p('b2',                                             // ← R1: hyphenated "24-hour"
        span('s1', 'Our security team provides 24-hour monitoring with guaranteed first-response to critical incidents.'),
      ),
      p('b3',
        span('s1', 'All incidents are logged and reviewed weekly.'),
      ),
    ],
  })
  gt('holdout', id, 'b2', F.support, 'R1', '24-hour', 'hyphenated alias in security policy')
}

// ── H6. Cancellation Policy ───────────────────────────────────────────────────
// R1: "one month" (b2); R2: "60 days" near "refund" (b3)
{
  const id = 'page-ho-cancellation'
  doc({
    _id: id, _type: 'page',
    title: 'Cancellation Policy',
    slug: { _type: 'slug', current: 'ho-cancellation' },
    kind: 'policy',
    body: [
      h2('b1', 'How to Cancel'),
      p('b2',                                             // ← R1: "one month" alias
        span('s1', 'You may cancel your subscription at any time. Refunds are available if cancelled within one month of billing.'),
      ),
      p('b3',                                             // ← R2: old value near "refund"
        span('s1', 'Customers who joined under our legacy plan had a 60 days refund eligibility window, which has since changed.'),
      ),
    ],
  })
  gt('holdout', id, 'b2', F.refund, 'R1', 'one month',  '"one month" alias in cancellation doc')
  gt('holdout', id, 'b3', F.refund, 'R2', '60 days refund', 'wrong value near "refund" label')
}

// ── H7. Compliance Page ───────────────────────────────────────────────────────
// R3: deprecated factRef (same pattern as dev page-support-sla)
{
  const id = 'page-ho-compliance'
  doc({
    _id: id, _type: 'page',
    title: 'Compliance Overview',
    slug: { _type: 'slug', current: 'ho-compliance' },
    kind: 'policy',
    body: [
      h2('b1', 'Historical Policy Reference'),
      p('b2',                                             // ← R3: deprecated factRef
        span('s1', 'For historical audits, the previous refund policy period was '),
        ref('fr1', F.oldRefund),
        span('s2', ', now superseded.'),
      ),
      p('b3',
        span('s1', 'Current policies are described in our main Terms of Service.'),
      ),
    ],
  })
  gt('holdout', id, 'b2', F.oldRefund, 'R3', 'factRef to deprecated fact-old-refund-window', 'deprecated factRef in compliance doc')
}

// ── H8. Accessibility Statement (clean — no planted issues) ───────────────────
// TRUE NEGATIVE: zero planted issues, scanner should produce zero findings here
{
  const id = 'page-ho-accessibility'
  doc({
    _id: id, _type: 'page',
    title: 'Accessibility Statement',
    slug: { _type: 'slug', current: 'ho-accessibility' },
    kind: 'policy',
    body: [
      h2('b1', 'Our Commitment to Accessibility'),
      p('b2',
        span('s1', 'We are committed to ensuring our platform is accessible to all users, including those with disabilities.'),
      ),
      p('b3',
        span('s1', 'We aim to meet WCAG 2.1 Level AA standards.'),
      ),
      p('b4',
        span('s1', 'If you encounter any accessibility barriers, please contact us and we will respond promptly.'),
      ),
    ],
  })
  // No ground truth entries — clean page, all findings here are false positives
}

// ─── Employee voice: policy updates ────────────────────────────────────────
// Officials post news / policy changes; employees upvote / downvote.
doc({
  _id: 'update-refund-60', _type: 'policyUpdate',
  title: 'Refund window extended to 60 days for annual plans',
  kind: 'policy-change',
  summary: 'Starting next quarter, annual-plan customers get a 60-day refund window instead of 30 days. Help pages and terms will be reconciled in one release.',
  author: 'Policy Office',
  linkedFact: { _type: 'reference', _ref: F.refund },
  linkedPage: { _type: 'reference', _ref: 'page-returns-policy' },
  status: 'published',
  upvotes: 42, downvotes: 3,
  publishedAt: '2026-09-18T09:00:00Z',
})
doc({
  _id: 'update-sla-9995', _type: 'policyUpdate',
  title: 'Enterprise SLA raised to 99.95% uptime',
  kind: 'policy-change',
  summary: 'Enterprise contracts now guarantee 99.95% monthly uptime, up from 99.9%. Sales collateral and status-page wording are being updated.',
  author: 'Policy Office',
  linkedFact: { _type: 'reference', _ref: F.sla },
  status: 'published',
  upvotes: 35, downvotes: 6,
  publishedAt: '2026-09-10T09:00:00Z',
})
doc({
  _id: 'update-soc2-audit', _type: 'policyUpdate',
  title: 'SOC2 Type II audit scheduled for November',
  kind: 'news',
  summary: 'External auditors will sample retention and access-control clauses. Please report any stale numbers you spot before October 30.',
  author: 'Security Team',
  linkedFact: { _type: 'reference', _ref: F.retention },
  status: 'published',
  upvotes: 28, downvotes: 1,
  publishedAt: '2026-09-02T09:00:00Z',
})
doc({
  _id: 'update-trial-faq', _type: 'policyUpdate',
  title: 'Free trial FAQ rewritten for clarity',
  kind: 'notice',
  summary: 'The trial FAQ confused "14 days" with "two weeks" in three places. The wording is now canonical and linked to the fact ledger.',
  author: 'Docs Team',
  linkedFact: { _type: 'reference', _ref: F.trial },
  status: 'published',
  upvotes: 19, downvotes: 2,
  publishedAt: '2026-08-24T09:00:00Z',
})
doc({
  _id: 'update-support-24h', _type: 'policyUpdate',
  title: 'Priority support response stays at 24 hours',
  kind: 'notice',
  summary: 'We evaluated a 4-hour priority window and decided to keep 24 hours. The proposal is parked; share your view with a vote.',
  author: 'Support Lead',
  linkedFact: { _type: 'reference', _ref: F.support },
  status: 'published',
  upvotes: 11, downvotes: 14,
  publishedAt: '2026-08-15T09:00:00Z',
})
doc({
  _id: 'update-late-fee', _type: 'policyUpdate',
  title: 'Late fee disclosure: draft open for comment',
  kind: 'news',
  summary: 'Finance proposes keeping the 1.5% monthly late fee but disclosing it earlier in checkout. Draft language is open for employee comment.',
  author: 'Finance Team',
  linkedFact: { _type: 'reference', _ref: F.lateFee },
  status: 'published',
  upvotes: 9, downvotes: 5,
  publishedAt: '2026-08-05T09:00:00Z',
})

// ─── Employee voice: complaints ──────────────────────────────────────────
// Employees raise issues against specific facts / pages.
doc({
  _id: 'complaint-refund-conflict', _type: 'complaint',
  title: 'Refund page still says 30 days, checkout says 60',
  category: 'contradiction',
  description: 'The pricing FAQ promises a 60-day refund but the help center article still says 30 days. A customer quoted the old number on a call today.',
  targetFact: { _type: 'reference', _ref: F.refund },
  raisedBy: 'Priya Nair',
  status: 'open',
  raisedAt: '2026-09-20T10:15:00Z',
})
doc({
  _id: 'complaint-warranty-confusion', _type: 'complaint',
  title: 'Warranty text confused with refund window',
  category: 'unclear',
  description: 'The getting-started guide mentions a 30-day warranty right next to the refund paragraph. New hires keep mixing them up.',
  targetFact: { _type: 'reference', _ref: F.refund },
  raisedBy: 'Tunde Ade',
  status: 'in-review',
  response: 'Good catch — we are splitting the paragraphs and linking the refund value to the ledger.',
  raisedAt: '2026-09-17T14:40:00Z',
})
doc({
  _id: 'complaint-sla-outdated', _type: 'complaint',
  title: 'Status page shows outdated 99.9% SLA',
  category: 'outdated',
  description: 'Enterprise SLA moved to 99.95% but the status page footer still shows 99.9%. This is a compliance risk.',
  targetFact: { _type: 'reference', _ref: F.sla },
  raisedBy: 'Maria Santos',
  status: 'open',
  raisedAt: '2026-09-15T08:05:00Z',
})
doc({
  _id: 'complaint-trial-unclear', _type: 'complaint',
  title: 'Trial length wording is ambiguous',
  category: 'unclear',
  description: '"Two weeks" vs "14 days" — do weekends count? Support gets this question weekly. Please pin one canonical phrasing.',
  targetFact: { _type: 'reference', _ref: F.trial },
  raisedBy: 'Jonas Weber',
  status: 'resolved',
  response: 'Resolved: FAQ now uses the canonical 14-day fact reference everywhere.',
  raisedAt: '2026-09-08T11:20:00Z',
  resolvedAt: '2026-09-12T16:00:00Z',
})
doc({
  _id: 'complaint-latefee-unfair', _type: 'complaint',
  title: 'Late fee disclosed too late in checkout',
  category: 'unfair',
  description: 'The 1.5% fee only appears on the final screen. Customers feel ambushed. Disclose it on the first billing screen.',
  targetFact: { _type: 'reference', _ref: F.lateFee },
  raisedBy: 'Aisha Khan',
  status: 'open',
  raisedAt: '2026-09-05T09:30:00Z',
})
doc({
  _id: 'complaint-support-hours', _type: 'complaint',
  title: 'Support hours contradict across regions',
  category: 'contradiction',
  description: 'EU help pages say 24-hour response, APAC pages say one business day. These differ on weekends — pick one definition.',
  targetFact: { _type: 'reference', _ref: F.support },
  raisedBy: 'Liam Murphy',
  status: 'in-review',
  response: 'Confirmed. Standardizing on 24 hours and aliasing one business day to it.',
  raisedAt: '2026-08-28T13:55:00Z',
})
doc({
  _id: 'complaint-filesize-table', _type: 'complaint',
  title: 'File size limits table hard to read',
  category: 'unclear',
  description: 'The limits table on the product page mixes MB and GB. New users upload oversized files and get errors.',
  targetFact: { _type: 'reference', _ref: F.fileSize },
  raisedBy: 'Sofia Rossi',
  status: 'resolved',
  response: 'Resolved: table now uses one unit column sourced from the fact ledger.',
  raisedAt: '2026-08-20T10:00:00Z',
  resolvedAt: '2026-08-27T15:30:00Z',
})
doc({
  _id: 'complaint-retention-years', _type: 'complaint',
  title: 'Nobody can find the retention period',
  category: 'other',
  description: 'The 7-year retention rule lives in one PDF. No help page references it, so teams guess. Can we publish it properly?',
  targetFact: { _type: 'reference', _ref: F.retention },
  raisedBy: 'David Okafor',
  status: 'open',
  raisedAt: '2026-08-12T09:10:00Z',
})

// ─── Employee voice: questions ─────────────────────────────────────────
// Employees ask about policies; officials answer.
doc({
  _id: 'question-refund-annual', _type: 'policyQuestion',
  question: 'Does the 60-day refund apply to monthly plans or only annual plans?',
  askedBy: 'Priya Nair',
  linkedFact: { _type: 'reference', _ref: F.refund },
  status: 'answered',
  answer: 'Only annual plans. Monthly plans keep the 30-day window. The pricing FAQ now states this explicitly.',
  answeredBy: 'Policy Office',
  helpful: 24,
  askedAt: '2026-09-19T09:00:00Z',
  answeredAt: '2026-09-19T15:30:00Z',
})
doc({
  _id: 'question-sla-credits', _type: 'policyQuestion',
  question: 'If uptime drops below the SLA, do customers get automatic credits?',
  askedBy: 'Tunde Ade',
  linkedFact: { _type: 'reference', _ref: F.sla },
  status: 'answered',
  answer: 'Yes — 10% service credit for every 0.1% below the SLA in a month, claimed via support within 30 days.',
  answeredBy: 'Policy Office',
  helpful: 18,
  askedAt: '2026-09-14T12:00:00Z',
  answeredAt: '2026-09-15T10:00:00Z',
})
doc({
  _id: 'question-trial-weekends', _type: 'policyQuestion',
  question: 'Does the 14-day trial count calendar days including weekends?',
  askedBy: 'Jonas Weber',
  linkedFact: { _type: 'reference', _ref: F.trial },
  status: 'answered',
  answer: 'Calendar days, including weekends and holidays. Day 1 is the signup day.',
  answeredBy: 'Docs Team',
  helpful: 15,
  askedAt: '2026-09-06T08:30:00Z',
  answeredAt: '2026-09-06T13:00:00Z',
})
doc({
  _id: 'question-latefee-when', _type: 'policyQuestion',
  question: 'When exactly is the 1.5% late fee applied — after the due date or after a grace period?',
  askedBy: 'Aisha Khan',
  linkedFact: { _type: 'reference', _ref: F.lateFee },
  status: 'open',
  helpful: 7,
  askedAt: '2026-09-21T10:45:00Z',
})
doc({
  _id: 'question-support-weekend', _type: 'policyQuestion',
  question: 'Is the 24-hour support response measured 24/7 or business hours only?',
  askedBy: 'Liam Murphy',
  linkedFact: { _type: 'reference', _ref: F.support },
  status: 'open',
  helpful: 5,
  askedAt: '2026-09-20T16:20:00Z',
})
doc({
  _id: 'question-filesize-video', _type: 'policyQuestion',
  question: 'Does the 100 MB file limit apply to video uploads too?',
  askedBy: 'Sofia Rossi',
  linkedFact: { _type: 'reference', _ref: F.fileSize },
  status: 'answered',
  answer: 'Yes, all file types share the 100 MB per-file limit. Enterprise plans can request higher caps.',
  answeredBy: 'Support Lead',
  helpful: 9,
  askedAt: '2026-08-29T11:00:00Z',
  answeredAt: '2026-08-30T09:15:00Z',
})

// ─── Seed function ──────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🌱 Fact Ledger seed — ${docs.length} documents\n`)
  console.log(`   Project: ${client.config().projectId}`)
  console.log(`   Dataset: ${client.config().dataset}\n`)

  // Write all documents using createOrReplace for idempotency
  const transaction = client.transaction()
  for (const d of docs) {
    transaction.createOrReplace(d as any)
  }

  const result = await transaction.commit({ visibility: 'async' })
  console.log(`✅ Committed ${result.results.length} operations`)

  // ── Write ground_truth.json ──────────────────────────────────────────────
  const devCount = groundTruth.filter(g => g.dataset === 'dev').length
  const holdoutCount = groundTruth.filter(g => g.dataset === 'holdout').length

  const gtPath = resolve(__dirname, '..', 'ground_truth.json')

  groundTruth.push({ dataset: 'dev', pageId: 'none', blockKey: 'none', factId: 'fact-data-retention-years', rule: 'R4', plantedText: 'zero page references' })
  
  writeFileSync(gtPath, JSON.stringify({
    generated: new Date().toISOString(),
    summary: {
      dev: { pages: 15, planted: devCount },
      holdout: { pages: 8, planted: holdoutCount },
      total: groundTruth.length,
      byRule: {
        R1: groundTruth.filter(g => g.rule === 'R1').length,
        R2: groundTruth.filter(g => g.rule === 'R2').length,
        R3: groundTruth.filter(g => g.rule === 'R3').length,
        R4: 1, // fact-data-retention-years, checked by listing active facts with zero references
      },
    },
    entries: groundTruth,
  }, null, 2))

  console.log(`\n📊 Ground truth written:`)
  console.log(`   Dev planted:     ${devCount}`)
  console.log(`   Holdout planted: ${holdoutCount}`)
  console.log(`   R1: ${groundTruth.filter(g => g.rule === 'R1').length}`)
  console.log(`   R2: ${groundTruth.filter(g => g.rule === 'R2').length}`)
  console.log(`   R3: ${groundTruth.filter(g => g.rule === 'R3').length}`)
  console.log(`   R4: 1 (fact-data-retention-years, zero page references)`)
  console.log(`\n✅ Seed complete. Run again to verify idempotency.\n`)
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
