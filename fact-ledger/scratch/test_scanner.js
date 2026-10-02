require('dotenv').config({ path: require('path').resolve(__dirname, '../web/.env.local') });
const { createClient } = require('@sanity/client');
const { runScanner } = require('@fact-ledger/scanner');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  const pages = await client.fetch('*[_type == "page"]');
  const facts = await client.fetch('*[_type == "fact"]');
  console.log(`Loaded ${pages.length} pages and ${facts.length} facts.`);
  const findings = runScanner(pages, facts);
  console.log(`Generated ${findings.length} findings.`);
}
main().catch(console.error);
