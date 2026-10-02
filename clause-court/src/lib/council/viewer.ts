import { cookies } from 'next/headers'
import { sanityClient } from '@/lib/sanity/client'
import {
  verifyIdentity,
  demoIdentityEnabled,
  type AuthStrength,
} from '@/lib/council/identity'

export const VIEWER_COOKIE = 'cc_member'

/**
 * The member the browser claims to be, with the strength of that claim.
 *
 * `auth` matters downstream: when it is `demo-unsigned` the write path records
 * that fact in the audit log, so the record never implies a verified identity
 * that did not happen.
 */
export interface ViewerIdentity {
  memberId: string
  auth: AuthStrength
}

export interface ViewerMember extends ViewerIdentity {
  _id: string
  name: string
  seat: string
  organizationId: string | null
  organizationName: string | null
}

const MEMBER_PROJECTION = `{_id, name, seat,
  "memberId": _id,
  "organizationId": organization._ref,
  "organizationName": organization->name}`

/** True when the deployment has no signing secret and every identity is unverified. */
export function identityIsDemo(): boolean {
  return demoIdentityEnabled()
}

export async function getViewerIdentity(): Promise<ViewerIdentity | null> {
  const jar = await cookies()
  const outcome = verifyIdentity(jar.get(VIEWER_COOKIE)?.value ?? null)
  return outcome.ok ? outcome.identity : null
}

export async function getViewerMember(): Promise<ViewerMember | null> {
  const identity = await getViewerIdentity()
  if (!identity) return null
  return sanityClient.fetch<ViewerMember | null>(
    `*[_type == "councilMember" && _id == $id && active == true][0]${MEMBER_PROJECTION}`,
    { id: identity.memberId }
  ).catch(() => null)
}
