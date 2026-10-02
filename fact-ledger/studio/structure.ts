import type { StructureBuilder } from 'sanity/structure'

/**
 * Custom Studio sidebar structure.
 * Spec §1 wants: Facts / Pages / Open findings / Releases
 */
export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Fact Ledger')
    .items([
      // ── Facts ──────────────────────────────────────
      S.listItem()
        .title('Facts')
        .id('facts')
        .child(
          S.list()
            .title('Facts')
            .items([
              S.listItem()
                .title('All Facts')
                .child(
                  S.documentTypeList('fact').title('All Facts')
                ),
              S.listItem()
                .title('Active')
                .child(
                  S.documentList()
                    .title('Active Facts')
                    .filter('_type == "fact" && status == "active"')
                ),
              S.listItem()
                .title('Deprecated')
                .child(
                  S.documentList()
                    .title('Deprecated Facts')
                    .filter('_type == "fact" && status == "deprecated"')
                ),
            ])
        ),

      // ── Pages ──────────────────────────────────────
      S.listItem()
        .title('Pages')
        .id('pages')
        .child(
          S.list()
            .title('Pages')
            .items([
              S.listItem()
                .title('All Pages')
                .child(S.documentTypeList('page').title('All Pages')),
              S.listItem()
                .title('Policy')
                .child(
                  S.documentList()
                    .title('Policy Pages')
                    .filter('_type == "page" && kind == "policy"')
                ),
              S.listItem()
                .title('Help')
                .child(
                  S.documentList()
                    .title('Help Pages')
                    .filter('_type == "page" && kind == "help"')
                ),
              S.listItem()
                .title('Pricing')
                .child(
                  S.documentList()
                    .title('Pricing Pages')
                    .filter('_type == "page" && kind == "pricing"')
                ),
              S.listItem()
                .title('FAQ')
                .child(
                  S.documentList()
                    .title('FAQ Pages')
                    .filter('_type == "page" && kind == "faq"')
                ),
            ])
        ),

      S.divider(),

      // ── Open Findings ──────────────────────────────
      S.listItem()
        .title('Open Findings')
        .id('open-findings')
        .child(
          S.documentList()
            .title('Open Findings')
            .filter('_type == "finding" && status == "open"')
            .defaultOrdering([{ field: 'detectedAt', direction: 'desc' }])
        ),

      S.listItem()
        .title('All Findings')
        .id('all-findings')
        .child(
          S.documentTypeList('finding').title('All Findings')
        ),

      S.divider(),

      // ── Remediation Releases ───────────────────────
      S.listItem()
        .title('Remediation Releases')
        .id('remediation-releases')
        .child(
          S.documentTypeList('remediation')
            .title('Remediation Releases')
        ),

      S.divider(),

      // ── Scan Runs ──────────────────────────────────
      S.listItem()
        .title('Scan Runs')
        .id('scan-runs')
        .child(
          S.documentTypeList('scanRun')
            .title('Scan Runs')
        ),

      // ── Audit Log ──────────────────────────────────
      S.listItem()
        .title('Audit Log')
        .id('audit-log')
        .child(
          S.documentTypeList('changeEvent')
            .title('Audit Log')
        ),

      S.divider(),

      // ── Benchmark Results ──────────────────────────
      S.listItem()
        .title('Benchmark Results')
        .id('benchmark-results')
        .child(
          S.documentTypeList('benchmarkResult')
            .title('Benchmark Results')
        ),

      S.divider(),

      // ── People ─────────────────────────────────────
      S.listItem()
        .title('People')
        .id('people')
        .child(
          S.documentTypeList('person').title('People')
        ),
    ])
