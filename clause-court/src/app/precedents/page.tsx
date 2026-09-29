import { sanityClient, PRECEDENT_LIST_QUERY } from '@/lib/sanity/client'
import PrecedentLibrary, { type PrecedentListItem } from './PrecedentLibrary'

// Rulings and clauses change on nearly every interaction in the demo, so this
// page must never serve a cached snapshot of the precedent record.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PrecedentsPage() {
  let precedents: PrecedentListItem[] = []
  let error: string | null = null

  try {
    precedents = await sanityClient.fetch(PRECEDENT_LIST_QUERY)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load precedent'
  }

  return <PrecedentLibrary precedents={precedents} error={error} />
}
