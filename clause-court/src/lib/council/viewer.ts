import { cookies } from 'next/headers'
import { sanityClient } from '@/lib/sanity/client'

export const VIEWER_COOKIE = 'cc_member'

/** Demo identity: the member the browser claims to be. Real sign-in replaces this. */
export async function getViewerMemberId(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(VIEWER_COOKIE)?.value ?? null
}

export interface ViewerMember {
  _id: string
  name: string
  seat: string
}

export async function getViewerMember(): Promise<ViewerMember | null> {
  const id = await getViewerMemberId()
  if (!id) return null
  return sanityClient.fetch<ViewerMember | null>(
    `*[_type == "councilMember" && _id == $id && active == true][0]{_id, name, seat}`,
    { id }
  ).catch(() => null)
}
