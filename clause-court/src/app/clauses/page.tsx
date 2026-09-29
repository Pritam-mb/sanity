import { sanityClient, CLAUSE_LIST_QUERY } from '@/lib/sanity/client'
import ClauseListClient from './ClauseListClient'
import type { Clause } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClausesPage() {
  let clauses: Clause[] = []
  let error: string | null = null

  try {
    clauses = await sanityClient.fetch<Clause[]>(CLAUSE_LIST_QUERY)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load clauses'
  }

  return <ClauseListClient clauses={clauses} error={error} />
}
