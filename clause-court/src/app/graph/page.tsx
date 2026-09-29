import { sanityClient, GRAPH_QUERY } from '@/lib/sanity/client'
import PrecedentGraph, { type GraphData } from './PrecedentGraph'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EMPTY: GraphData = { clauses: [], rulings: [], precedents: [] }

export default async function GraphPage() {
  let data: GraphData = EMPTY
  let error: string | null = null

  try {
    data = await sanityClient.fetch<GraphData>(GRAPH_QUERY)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load the graph'
  }

  return <PrecedentGraph data={data} error={error} />
}
