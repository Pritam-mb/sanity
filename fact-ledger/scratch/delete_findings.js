require('dotenv').config({ path: require('path').resolve(__dirname, '../web/.env.local') });
const { createClient } = require('@sanity/client');
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  const findings = await client.fetch('*[_type == "finding"]{_id}');
  console.log(`Deleting ${findings.length} findings...`);
  const tx = client.transaction();
  for (const f of findings) {
    tx.delete(f._id);
  }
  await tx.commit();
  console.log('Done!');
}
main().catch(console.error);
