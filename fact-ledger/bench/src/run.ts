import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { runScanner } from '@fact-ledger/scanner'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../web/.env.local') })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// Load ground truth
const gtPath = resolve(__dirname, '../../seed/ground_truth.json')
const gtData = JSON.parse(readFileSync(gtPath, 'utf8'))
const groundTruth = gtData.entries

async function runBenchmark() {
  console.log(`\n🏃 Running benchmark...`)
  
  // Fetch facts
  const facts = await client.fetch(`*[_type == "fact"]`)
  
  // Fetch ALL pages for scanner
  const pages = await client.fetch(`*[_type == "page"]`)
  console.log(`Loaded ${facts.length} facts, ${pages.length} pages.`)
  
  // Run the scanner once against the entire dataset
  const startTime = Date.now()
  const allFindings = runScanner(pages, facts)
  const duration = Date.now() - startTime
  console.log(`Scanner generated ${allFindings.length} total findings in ${duration}ms.\n`)
  
  for (const datasetType of ['dev', 'holdout'] as const) {
    console.log(`\n--- Dataset: ${datasetType} ---`)
    
    // Filter pages and findings for this dataset
    const datasetPages = datasetType === 'dev' 
      ? pages.filter((p: any) => p._id.startsWith('page-') && !p._id.startsWith('page-ho-'))
      : pages.filter((p: any) => p._id.startsWith('page-ho-'))
      
    // Filter findings. R4 findings (pageId='none') apply to all datasets but we'll score them on dev.
    const findings = allFindings.filter(f => 
      datasetPages.find((p: any) => p._id === f.pageId) || (f.rule === 'R4' && datasetType === 'dev')
    )
    
    // Compute metrics per rule
    const rules = ['R1', 'R2', 'R3', 'R4']
    const metrics = []
    const gtDataset = groundTruth.filter((g: any) => g.dataset === datasetType)
  
  for (const rule of rules) {
    const gtRule = gtDataset.filter((g: any) => g.rule === rule)
    const fnRule = findings.filter(f => f.rule === rule)
    
    let tp = 0
    let fp = 0
    let fn = 0
    
    // Check True Positives and False Positives
    for (const finding of fnRule) {
      // Find matching ground truth entry
      const match = gtRule.find((g: any) => 
        g.factId === finding.factId && 
        g.pageId === finding.pageId && 
        (rule === 'R4' || g.blockKey === finding.blockKey)
      )
      
      if (match) {
        tp++
        ;(match as any)._matched = true
      } else {
        fp++
        console.log(`[FP] ${rule} finding not in GT (${datasetType}): page=${finding.pageId}, fact=${finding.factId}, value="${finding.foundValue}", excerpt="${finding.excerpt}"`)
      }
    }
    
    // False Negatives are GT entries that were NOT matched
    const fns = gtRule.filter((g: any) => !(g as any)._matched)
    fn = fns.length
    for (const g of fns) console.log(`[FN] ${rule} GT not found by scanner (${datasetType}): page=${g.pageId}, fact=${g.factId}, text="${g.plantedText}"`)
    
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0
    
    metrics.push({ _key: rule, rule, tp, fp, fn, precision, recall })
  }
  
  // Calculate baseline metrics (exact string match for R1)
  let baselineTp = 0
  let baselineFn = 0
  
  const gtR1 = gtDataset.filter((g: any) => g.rule === 'R1')
  
  for (const g of gtR1) {
    const page = pages.find((p: any) => p._id === g.pageId)
    const fact = facts.find((f: any) => f._id === g.factId)
    if (page && fact) {
       // A dumb baseline just searches for the exact exact value in the page text
       let found = false
       for (const block of page.body) {
         for (const child of block.children || []) {
           if (child._type === 'span' && child.text.includes(fact.value)) {
             found = true
           }
         }
       }
       if (found) baselineTp++
       else baselineFn++
    } else {
       baselineFn++
    }
  }
  
  const baselineRecall = baselineTp + baselineFn > 0 ? baselineTp / (baselineTp + baselineFn) : 0
  const baseline = {
    name: 'Exact string search',
    tp: baselineTp,
    fn: baselineFn,
    recall: baselineRecall
  }
  
  // Print results nicely
  console.log('--- Results: ---')
  for (const m of metrics) {
    console.log(`${m.rule} | TP: ${m.tp.toString().padStart(2)} | FP: ${m.fp.toString().padStart(2)} | FN: ${m.fn.toString().padStart(2)} | P: ${(m.precision*100).toFixed(1)}% | R: ${(m.recall*100).toFixed(1)}%`)
  }
  console.log(`\nBaseline (Exact match R1) | TP: ${baseline.tp} | FN: ${baseline.fn} | Recall: ${(baseline.recall*100).toFixed(1)}%`)
  
  // Write to Sanity for the dashboard (P4/P5)
  const resultDoc = {
    _type: 'benchmarkResult',
    ranAt: new Date().toISOString(),
    dataset: datasetType,
    perRule: metrics,
    baseline
  }
  
    await client.create(resultDoc)
    console.log(`\n✅ Saved benchmarkResult for ${datasetType} to Sanity.`)
  }
}

async function main() {
  await runBenchmark()
  console.log(`\n🎉 Benchmark complete! Check the dashboard to see the results.`)
}

main().catch(err => {
  console.error('Bench failed:', err)
  process.exit(1)
})
