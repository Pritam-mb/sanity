import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

console.log('📡 Starting Local Webhook Proxy...')
console.log(`Listening for document changes on project ${client.config().projectId}...`)

const query = '*[_type in ["page", "fact"]]'

client.listen(query, {}, { includeResult: true }).subscribe(async (update: any) => {
  if (update.transition === 'update' || update.transition === 'appear') {
    const doc = update.result
    console.log(`\n🔔 Detected change on ${doc._type} (id: ${doc._id}). Forwarding to localhost webhook...`)
    
    try {
      const response = await fetch('http://localhost:3000/api/webhook/sanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(doc),
      })
      
      const json = await response.json()
      console.log(`✅ Webhook processed! HTTP ${response.status}`, json)
    } catch (err: any) {
      console.error(`❌ Webhook forward failed:`, err.message)
    }
  }
})
