import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'tmics7hc'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'fact-ledger'
const apiVersion = '2024-01-01'

/** Read-only public client (used in Server Components for GROQ queries) */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.NEXT_PUBLIC_SANITY_READ_TOKEN,
})

/** Write client (used in API routes only, server-side) */
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})
