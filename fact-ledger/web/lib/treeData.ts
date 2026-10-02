import { sanityClient } from '@/lib/sanity/client'

export interface TimelinePoint {
  id: string
  step: number
  title: string
  timestamp: string
  status: 'completed' | 'in_progress' | 'pending'
  actor: string
  details: string
  badge: string
}

export interface AffectedItem {
  id: string
  pageId: string
  pageTitle: string
  pageSlug: string
  clauseTitle: string
  blockKey: string
  rule: string
  ruleName: string
  excerpt: string
  foundValue: string
  canonicalValue: string
  status: 'open' | 'drafted' | 'fixed' | 'dismissed'
  remediationSnippet?: {
    beforeText: string
    afterText: string
    mutationJson?: string
  }
}

export interface ChangeTreeNode {
  sessionId: string
  member: {
    id: string
    name: string
    email: string
    role: string
    avatarCode: string
    department: string
  }
  document: {
    id: string
    title: string
    slug: string
    kind: string
    lastModified: string
  }
  clause: {
    id: string
    key: string
    title: string
    section: string
    beforeValue: string
    afterValue: string
    unit: string
    summary: string
  }
  affectedItems: AffectedItem[]
  timeline: TimelinePoint[]
  metrics: {
    totalAffected: number
    openDrift: number
    fixedCount: number
    riskScore: string
  }
}

export async function getTreeSessionsData(): Promise<ChangeTreeNode[]> {
  try {
    const [findings, facts, changeEvents] = await Promise.all([
      sanityClient.fetch<any[]>(`*[_type=="finding"]{
        _id,
        rule,
        status,
        excerpt,
        foundValue,
        blockKey,
        childKey,
        page->{ _id, title, slug, kind },
        fact->{ _id, label, value, key, unit }
      }`),
      sanityClient.fetch<any[]>(`*[_type=="fact"]{
        _id,
        key,
        label,
        value,
        unit,
        status
      }`),
      sanityClient.fetch<any[]>(`*[_type=="changeEvent"] | order(at desc)[0...10]{
        _id,
        action,
        actor,
        at,
        releaseId,
        before,
        after,
        target->{ _type, _id }
      }`),
    ])

    const ruleNames: Record<string, string> = {
      R1: 'Unlinked Match',
      R2: 'Contradiction',
      R3: 'Deprecated Ref',
      R4: 'Orphan Fact',
      R5: 'Temporal Bound',
    }

    const liveAffectedItems: AffectedItem[] = (findings || []).slice(0, 8).map(f => ({
      id: f._id,
      pageId: f.page?._id || 'unknown-page',
      pageTitle: f.page?.title || 'Monitored Content Page',
      pageSlug: f.page?.slug?.current || 'page',
      clauseTitle: `Clause reference: ${f.fact?.label || 'Business Fact'}`,
      blockKey: f.blockKey || 'block-pt-0',
      rule: f.rule || 'R1',
      ruleName: ruleNames[f.rule] || f.rule || 'Policy Rule',
      excerpt: f.excerpt || `Mention of ${f.foundValue || 'fact value'}`,
      foundValue: f.foundValue || '30 days',
      canonicalValue: f.fact?.value ? `${f.fact.value} ${f.fact.unit || ''}`.trim() : '60 days',
      status: f.status === 'fixed' ? 'fixed' : f.status === 'dismissed' ? 'dismissed' : 'open',
      remediationSnippet: {
        beforeText: f.excerpt || `Stale clause text referencing ${f.foundValue || '30 days'}`,
        afterText: `Updated dynamic factRef referencing [${f.fact?.label || 'Fact'}: ${f.fact?.value || '60'} ${f.fact?.unit || 'days'}]`,
        mutationJson: JSON.stringify({ patch: { id: f.page?._id, set: { status: 'remediated' } } }, null, 2),
      },
    }))

    const liveSession: ChangeTreeNode = {
      sessionId: 'session-live-sanity',
      member: {
        id: 'user-live-engine',
        name: 'Live Sanity Content Lake',
        email: 'lake-engine@fact-ledger.sanity.io',
        role: 'Automated Change Feed',
        avatarCode: 'SL',
        department: 'Sanity.io Content Engine',
      },
      document: {
        id: 'doc-live-policy',
        title: 'Refund Policy & SLA Terms',
        slug: 'refund-policy',
        kind: 'policy',
        lastModified: changeEvents[0]?.at || new Date().toISOString(),
      },
      clause: {
        id: 'clause-live-params',
        key: 'refund_window_days',
        title: 'Section 4.1: Customer Return and Money Back Period',
        section: 'Section 4.1',
        beforeValue: '30 days',
        afterValue: '60 days',
        unit: 'days',
        summary: 'Extended canonical return eligibility from 30 calendar days to 60 calendar days.',
      },
      affectedItems: liveAffectedItems,
      timeline: [
        {
          id: 'tl-1',
          step: 1,
          title: 'Document & Clause Edited',
          timestamp: changeEvents[0]?.at || '2026-10-02T14:22:10Z',
          status: 'completed',
          actor: changeEvents[0]?.actor || 'editor@fact-ledger.sanity.io',
          details: 'Updated Refund Window canonical value from 30 days to 60 days.',
          badge: 'SOURCE_EDIT',
        },
        {
          id: 'tl-2',
          step: 2,
          title: 'Algorithmic Scanner Evaluated',
          timestamp: '2026-10-02T14:22:12Z',
          status: 'completed',
          actor: 'System Scanner (R1 to R5)',
          details: `Evaluated 23 pages and flagged ${liveAffectedItems.filter(i => i.status === 'open').length} unlinked or contradictory clauses.`,
          badge: 'SCAN_COMPLETE',
        },
        {
          id: 'tl-3',
          step: 3,
          title: 'AI Remediation Patches Drafted',
          timestamp: '2026-10-02T14:22:15Z',
          status: 'completed',
          actor: 'AI Remediation Agent',
          details: 'Synthesized Portable Text slice mutations injecting dynamic factRef references.',
          badge: 'DRAFT_SYNTHESIZED',
        },
        {
          id: 'tl-4',
          step: 4,
          title: 'Human Review & Approval Gate',
          timestamp: '2026-10-02T14:24:00Z',
          status: 'in_progress',
          actor: 'Editorial Review Board',
          details: 'Awaiting human sign-off on 4 proposed page diffs in Sanity Studio desk.',
          badge: 'AWAITING_SIGNOFF',
        },
        {
          id: 'tl-5',
          step: 5,
          title: 'Atomic Release & Zero Drift',
          timestamp: '2026-10-02T14:26:30Z',
          status: 'pending',
          actor: 'Sanity Studio Release Action',
          details: 'One-click transaction to atomically patch all 4 documents and reset Drift Score to 0.',
          badge: 'RELEASE_PENDING',
        },
      ],
      metrics: {
        totalAffected: liveAffectedItems.length,
        openDrift: liveAffectedItems.filter(i => i.status === 'open').length,
        fixedCount: liveAffectedItems.filter(i => i.status === 'fixed').length,
        riskScore: 'HIGH IMPACT',
      },
    }

    const sarahSession: ChangeTreeNode = {
      sessionId: 'session-sarah-refund',
      member: {
        id: 'member-sarah-chen',
        name: 'Sarah Chen',
        email: 'sarah.chen@acme.corp',
        role: 'Lead Legal Editor',
        avatarCode: 'SC',
        department: 'Corporate Legal & Policy',
      },
      document: {
        id: 'page-refund-policy',
        title: 'Master Refund & Return Policy',
        slug: 'refund-policy',
        kind: 'policy',
        lastModified: '2026-10-02T15:30:00Z',
      },
      clause: {
        id: 'clause-refund-window',
        key: 'refund_window_days',
        title: 'Section 4.1: Customer Return and Money Back Period',
        section: 'Section 4.1',
        beforeValue: '30 days',
        afterValue: '60 days',
        unit: 'days',
        summary: 'Extended canonical return eligibility from 30 calendar days to 60 calendar days.',
      },
      affectedItems: [
        {
          id: 'aff-sarah-1',
          pageId: 'page-terms-of-service',
          pageTitle: 'Terms of Service',
          pageSlug: 'terms-of-service',
          clauseTitle: 'Article 9.2: Customer Cancellation & Cooling-off',
          blockKey: 'bk-tos-refund',
          rule: 'R2',
          ruleName: 'Contradiction',
          excerpt: 'Customers may request a full refund within thirty (30) days of subscription initiation.',
          foundValue: '30 days',
          canonicalValue: '60 days',
          status: 'open',
          remediationSnippet: {
            beforeText: 'Customers may request a full refund within thirty (30) days of subscription initiation.',
            afterText: 'Customers may request a full refund within [factRef: 60 days] of subscription initiation.',
            mutationJson: JSON.stringify({ page: 'page-terms-of-service', block: 'bk-tos-refund', action: 'replace_span' }, null, 2),
          },
        },
        {
          id: 'aff-sarah-2',
          pageId: 'page-help-billing',
          pageTitle: 'Help Center: Billing & Subscriptions FAQ',
          pageSlug: 'help-billing-faq',
          clauseTitle: 'FAQ Question 3: How do I request a refund?',
          blockKey: 'bk-help-faq-3',
          rule: 'R1',
          ruleName: 'Unlinked Match',
          excerpt: 'We offer a no-questions-asked 30-day money-back guarantee on all plans.',
          foundValue: '30 days',
          canonicalValue: '60 days',
          status: 'open',
          remediationSnippet: {
            beforeText: 'We offer a no-questions-asked 30-day money-back guarantee on all plans.',
            afterText: 'We offer a no-questions-asked [factRef: 60 days] money-back guarantee on all plans.',
            mutationJson: JSON.stringify({ page: 'page-help-billing', block: 'bk-help-faq-3', action: 'replace_span' }, null, 2),
          },
        },
        {
          id: 'aff-sarah-3',
          pageId: 'page-pricing-faq',
          pageTitle: 'Pricing & Plan Comparison FAQ',
          pageSlug: 'pricing-faq',
          clauseTitle: 'Section 2: Satisfaction Guarantee',
          blockKey: 'bk-pricing-faq-2',
          rule: 'R1',
          ruleName: 'Unlinked Match',
          excerpt: 'Every tier includes our standard 30-day guarantee from checkout date.',
          foundValue: '30 days',
          canonicalValue: '60 days',
          status: 'drafted',
          remediationSnippet: {
            beforeText: 'Every tier includes our standard 30-day guarantee from checkout date.',
            afterText: 'Every tier includes our standard [factRef: 60 days] guarantee from checkout date.',
            mutationJson: JSON.stringify({ page: 'page-pricing-faq', block: 'bk-pricing-faq-2', action: 'replace_span' }, null, 2),
          },
        },
        {
          id: 'aff-sarah-4',
          pageId: 'page-customer-onboarding',
          pageTitle: 'Customer Welcome & Onboarding Guide',
          pageSlug: 'customer-onboarding',
          clauseTitle: 'Step 5: Account Guarantees',
          blockKey: 'bk-onboarding-5',
          rule: 'R1',
          ruleName: 'Unlinked Match',
          excerpt: 'Take your time evaluating our platform during your first 30 days.',
          foundValue: '30 days',
          canonicalValue: '60 days',
          status: 'fixed',
          remediationSnippet: {
            beforeText: 'Take your time evaluating our platform during your first 30 days.',
            afterText: 'Take your time evaluating our platform during your first [factRef: 60 days].',
            mutationJson: JSON.stringify({ page: 'page-customer-onboarding', block: 'bk-onboarding-5', action: 'applied' }, null, 2),
          },
        },
      ],
      timeline: [
        {
          id: 'tl-s-1',
          step: 1,
          title: 'Clause Modified in CMS',
          timestamp: '2026-10-02T15:30:00Z',
          status: 'completed',
          actor: 'Sarah Chen (Lead Legal Editor)',
          details: 'Updated Section 4.1 in Master Refund Policy from 30 to 60 days to match Q4 policy shift.',
          badge: 'MODIFIED_BY_MEMBER',
        },
        {
          id: 'tl-s-2',
          step: 2,
          title: 'Drift Impact Tree Generated',
          timestamp: '2026-10-02T15:30:02Z',
          status: 'completed',
          actor: 'System Scanner Engine',
          details: 'Scanned 23 content pages. Identified 4 downstream documents with stale clause copy.',
          badge: 'IMPACT_CALCULATED',
        },
        {
          id: 'tl-s-3',
          step: 3,
          title: 'AI Remediation Patch Drafted',
          timestamp: '2026-10-02T15:30:05Z',
          status: 'completed',
          actor: 'AI Remediation Agent',
          details: 'Generated exact JSON patch operations replacing raw text with dynamic factRef objects.',
          badge: 'PATCHES_READY',
        },
        {
          id: 'tl-s-4',
          step: 4,
          title: 'Legal Team Review',
          timestamp: '2026-10-02T15:32:00Z',
          status: 'in_progress',
          actor: 'Sarah Chen & Compliance Team',
          details: '3 of 4 proposed diffs approved. Awaiting confirmation on Terms of Service clause.',
          badge: 'IN_REVIEW',
        },
        {
          id: 'tl-s-5',
          step: 5,
          title: 'Publish Atomic Release',
          timestamp: '2026-10-02T15:35:00Z',
          status: 'pending',
          actor: 'Sanity Studio Release Action',
          details: 'Will execute multi-document commit across all 4 pages simultaneously.',
          badge: 'READY_TO_HEAL',
        },
      ],
      metrics: {
        totalAffected: 4,
        openDrift: 2,
        fixedCount: 1,
        riskScore: 'CRITICAL LEGAL DRIFT',
      },
    }

    const alexSession: ChangeTreeNode = {
      sessionId: 'session-alex-sla',
      member: {
        id: 'member-alex-rivera',
        name: 'Alex Rivera',
        email: 'alex.rivera@acme.corp',
        role: 'Compliance & SLA Officer',
        avatarCode: 'AR',
        department: 'Regulatory Compliance & Trust',
      },
      document: {
        id: 'page-enterprise-sla',
        title: 'Enterprise Master Service Level Agreement',
        slug: 'enterprise-sla',
        kind: 'policy',
        lastModified: '2026-10-02T16:10:00Z',
      },
      clause: {
        id: 'clause-sla-uptime',
        key: 'sla_uptime_pct',
        title: 'Section 2.3: Guaranteed Uptime Availability Threshold',
        section: 'Section 2.3',
        beforeValue: '99.0%',
        afterValue: '99.9%',
        unit: '%',
        summary: 'Elevated production uptime guarantee from two nines (99.0%) to three nines (99.9%).',
      },
      affectedItems: [
        {
          id: 'aff-alex-1',
          pageId: 'page-sales-contract-template',
          pageTitle: 'Enterprise Sales Contract Template',
          pageSlug: 'enterprise-contract-template',
          clauseTitle: 'Schedule B: Service Performance Guarantees',
          blockKey: 'bk-contract-sla',
          rule: 'R2',
          ruleName: 'Contradiction',
          excerpt: 'Vendor warrants that system services shall maintain 99.0% monthly uptime.',
          foundValue: '99.0%',
          canonicalValue: '99.9%',
          status: 'open',
          remediationSnippet: {
            beforeText: 'Vendor warrants that system services shall maintain 99.0% monthly uptime.',
            afterText: 'Vendor warrants that system services shall maintain [factRef: 99.9%] monthly uptime.',
            mutationJson: JSON.stringify({ page: 'page-sales-contract-template', block: 'bk-contract-sla', action: 'update_clause' }, null, 2),
          },
        },
        {
          id: 'aff-alex-2',
          pageId: 'page-trust-security',
          pageTitle: 'Trust, Reliability & Security Portal',
          pageSlug: 'trust-security',
          clauseTitle: 'Section 1.1: Platform High Availability',
          blockKey: 'bk-trust-ha',
          rule: 'R1',
          ruleName: 'Unlinked Match',
          excerpt: 'Our distributed multi-region infrastructure delivers 99.0% historical availability.',
          foundValue: '99.0%',
          canonicalValue: '99.9%',
          status: 'drafted',
          remediationSnippet: {
            beforeText: 'Our distributed multi-region infrastructure delivers 99.0% historical availability.',
            afterText: 'Our distributed multi-region infrastructure delivers [factRef: 99.9%] historical availability.',
            mutationJson: JSON.stringify({ page: 'page-trust-security', block: 'bk-trust-ha', action: 'update_clause' }, null, 2),
          },
        },
        {
          id: 'aff-alex-3',
          pageId: 'page-pricing-enterprise',
          pageTitle: 'Enterprise Plan Comparison Sheet',
          pageSlug: 'pricing-enterprise',
          clauseTitle: 'Tier Breakdown: Availability Guarantees',
          blockKey: 'bk-tier-sla',
          rule: 'R1',
          ruleName: 'Unlinked Match',
          excerpt: 'Dedicated enterprise clusters backed by a 99.0% financial SLA guarantee.',
          foundValue: '99.0%',
          canonicalValue: '99.9%',
          status: 'fixed',
          remediationSnippet: {
            beforeText: 'Dedicated enterprise clusters backed by a 99.0% financial SLA guarantee.',
            afterText: 'Dedicated enterprise clusters backed by a [factRef: 99.9%] financial SLA guarantee.',
            mutationJson: JSON.stringify({ page: 'page-pricing-enterprise', block: 'bk-tier-sla', action: 'applied' }, null, 2),
          },
        },
      ],
      timeline: [
        {
          id: 'tl-a-1',
          step: 1,
          title: 'SLA Clause Upgraded',
          timestamp: '2026-10-02T16:10:00Z',
          status: 'completed',
          actor: 'Alex Rivera (Compliance Officer)',
          details: 'Updated Section 2.3 in Enterprise SLA to 99.9% following infrastructure certification.',
          badge: 'MODIFIED_BY_MEMBER',
        },
        {
          id: 'tl-a-2',
          step: 2,
          title: 'Contract Drift Detected',
          timestamp: '2026-10-02T16:10:02Z',
          status: 'completed',
          actor: 'System Scanner Engine',
          details: '3 dependent documents flagged with outdated 99.0% commitments.',
          badge: 'IMPACT_CALCULATED',
        },
        {
          id: 'tl-a-3',
          step: 3,
          title: 'Remediation Proposed',
          timestamp: '2026-10-02T16:10:06Z',
          status: 'completed',
          actor: 'AI Remediation Agent',
          details: 'Constructed JSON patches linking Schedule B and Trust portal directly to canonical SLA fact.',
          badge: 'PATCHES_READY',
        },
        {
          id: 'tl-a-4',
          step: 4,
          title: 'Compliance Sign-off',
          timestamp: '2026-10-02T16:12:00Z',
          status: 'completed',
          actor: 'Alex Rivera',
          details: 'All diffs inspected and verified for legal compliance.',
          badge: 'APPROVED',
        },
        {
          id: 'tl-a-5',
          step: 5,
          title: 'Atomic Multi-Doc Release',
          timestamp: '2026-10-02T16:15:00Z',
          status: 'in_progress',
          actor: 'Sanity Studio Release Action',
          details: 'Applying atomic transaction across 3 documents.',
          badge: 'COMMITTING_CHANGES',
        },
      ],
      metrics: {
        totalAffected: 3,
        openDrift: 1,
        fixedCount: 1,
        riskScore: 'HIGH CONTRACT RISK',
      },
    }

    const marcusSession: ChangeTreeNode = {
      sessionId: 'session-marcus-upload',
      member: {
        id: 'member-marcus-vance',
        name: 'Marcus Vance',
        email: 'marcus.vance@acme.corp',
        role: 'VP Product & Operations',
        avatarCode: 'MV',
        department: 'Product Operations & Infrastructure',
      },
      document: {
        id: 'page-product-limits',
        title: 'Platform Limits & Quotas Guide',
        slug: 'product-limits',
        kind: 'help',
        lastModified: '2026-10-02T17:00:00Z',
      },
      clause: {
        id: 'clause-upload-limit',
        key: 'max_file_size_mb',
        title: 'Section 7.4: Maximum Single File Upload Payload',
        section: 'Section 7.4',
        beforeValue: '50 MB',
        afterValue: '100 MB',
        unit: 'MB',
        summary: 'Doubled standard asset upload quota from 50 MB to 100 MB per attachment.',
      },
      affectedItems: [
        {
          id: 'aff-marcus-1',
          pageId: 'page-help-attachments',
          pageTitle: 'Help Center: File Uploads & Attachment Errors',
          pageSlug: 'help-attachments',
          clauseTitle: 'FAQ: Why is my file rejected?',
          blockKey: 'bk-help-attach',
          rule: 'R1',
          ruleName: 'Unlinked Match',
          excerpt: 'Files exceeding 50 MB cannot be processed and will trigger a 413 error code.',
          foundValue: '50 MB',
          canonicalValue: '100 MB',
          status: 'open',
          remediationSnippet: {
            beforeText: 'Files exceeding 50 MB cannot be processed and will trigger a 413 error code.',
            afterText: 'Files exceeding [factRef: 100 MB] cannot be processed and will trigger a 413 error code.',
            mutationJson: JSON.stringify({ page: 'page-help-attachments', block: 'bk-help-attach', action: 'patch_payload' }, null, 2),
          },
        },
        {
          id: 'aff-marcus-2',
          pageId: 'page-developer-api-docs',
          pageTitle: 'Developer REST API Reference: Media Endpoints',
          pageSlug: 'developer-api-media',
          clauseTitle: 'Payload Restrictions: POST /v1/assets/upload',
          blockKey: 'bk-api-post-media',
          rule: 'R1',
          ruleName: 'Unlinked Match',
          excerpt: 'The multipart form body is capped at a strict 50 MB boundary.',
          foundValue: '50 MB',
          canonicalValue: '100 MB',
          status: 'fixed',
          remediationSnippet: {
            beforeText: 'The multipart form body is capped at a strict 50 MB boundary.',
            afterText: 'The multipart form body is capped at a strict [factRef: 100 MB] boundary.',
            mutationJson: JSON.stringify({ page: 'page-developer-api-docs', block: 'bk-api-post-media', action: 'applied' }, null, 2),
          },
        },
      ],
      timeline: [
        {
          id: 'tl-m-1',
          step: 1,
          title: 'Storage Limit Increased',
          timestamp: '2026-10-02T17:00:00Z',
          status: 'completed',
          actor: 'Marcus Vance (VP Product)',
          details: 'Updated Section 7.4 in Platform Limits Guide from 50 MB to 100 MB.',
          badge: 'MODIFIED_BY_MEMBER',
        },
        {
          id: 'tl-m-2',
          step: 2,
          title: 'API & Help Docs Drift Flagged',
          timestamp: '2026-10-02T17:00:01Z',
          status: 'completed',
          actor: 'System Scanner Engine',
          details: '2 technical documentation pages flagged with obsolete 50 MB text limits.',
          badge: 'IMPACT_CALCULATED',
        },
        {
          id: 'tl-m-3',
          step: 3,
          title: 'Technical Fixes Drafted',
          timestamp: '2026-10-02T17:00:04Z',
          status: 'completed',
          actor: 'AI Remediation Agent',
          details: 'Prepared Portable Text mutations for REST API docs and Help Center.',
          badge: 'PATCHES_READY',
        },
        {
          id: 'tl-m-4',
          step: 4,
          title: 'Product Review Sign-off',
          timestamp: '2026-10-02T17:02:00Z',
          status: 'completed',
          actor: 'Marcus Vance',
          details: 'Approved diffs. API reference verified with engineering backend.',
          badge: 'APPROVED',
        },
        {
          id: 'tl-m-5',
          step: 5,
          title: 'Release Published',
          timestamp: '2026-10-02T17:05:00Z',
          status: 'completed',
          actor: 'Sanity Studio Release Action',
          details: 'Both pages successfully patched and published in single atomic transaction.',
          badge: 'HEALED_ZERO_DRIFT',
        },
      ],
      metrics: {
        totalAffected: 2,
        openDrift: 1,
        fixedCount: 1,
        riskScore: 'MEDIUM USER EXPERIENCE',
      },
    }

    return [sarahSession, alexSession, marcusSession, liveSession]
  } catch (err) {
    console.error('getTreeSessionsData error:', err)
    return []
  }
}
