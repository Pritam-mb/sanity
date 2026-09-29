import { sanityClient, PRECEDENT_BY_ID_QUERY } from '@/lib/sanity/client'
import { notFound } from 'next/navigation'
import PrecedentDetailClient, {
  type PrecedentDetail,
} from './PrecedentDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

export default async function PrecedentPage({ params }: Props) {
  const { id } = await params

  const precedent = await sanityClient
    .fetch<PrecedentDetail | null>(PRECEDENT_BY_ID_QUERY, { id })
    .catch(() => null)

  if (!precedent) notFound()

  // Ordinals are assigned by creation order across the whole library, so the
  // numbering stays stable as citations accumulate.
  const index: number = await sanityClient
    .fetch(
      `count(*[_type == "precedent" && _createdAt <= $createdAt])`,
      { createdAt: precedent._createdAt }
    )
    .catch(() => 1)

  return <PrecedentDetailClient precedent={precedent} ordinal={index} />
}
