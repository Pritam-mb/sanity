import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sanityClient } from '@/lib/sanity/client'
import {
  VIEWER_COOKIE,
  getViewerIdentity,
  identityIsDemo,
} from '@/lib/council/viewer'
import {
  IDENTITY_SECRET_ENV,
  identitySecret,
  signMemberId,
} from '@/lib/council/identity'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// =============================================
// /api/identity — issue, read and clear the actor identity
// =============================================
//
// The cookie has to be signed on the server, because the signature is an HMAC
// over the member id with a secret the browser never sees. `MemberSwitcher`
// therefore cannot write the cookie itself; it posts the member id here and the
// route mints `<id>.<hmac>`.
//
// Signing is only real when CC_IDENTITY_SECRET is set. Without it we still
// issue a cookie — otherwise the demo is unusable — but `identityIsDemo()` is
// true and every write records `actorAuth: 'demo-unsigned'` in the audit log.
// The GET response says which of the two you are in, so the UI never has to
// guess.

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/** GET /api/identity — who the server thinks you are, and how sure it is. */
export async function GET() {
  const identity = await getViewerIdentity()
  return NextResponse.json({
    identity,
    demo: identityIsDemo(),
    cookie: VIEWER_COOKIE,
    secretEnv: IDENTITY_SECRET_ENV,
  })
}

/** POST /api/identity { memberId } — sign in as an active council member. */
export async function POST(req: NextRequest) {
  let memberId: unknown

  try {
    const body = (await req.json()) as { memberId?: unknown }
    memberId = body.memberId
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  if (typeof memberId !== 'string' || !memberId.trim()) {
    return NextResponse.json(
      { error: 'memberId is required.' },
      { status: 400 }
    )
  }
  const id = memberId.trim()

  // An identity is only issued for a seat that exists and is filled. Minting a
  // signature for an arbitrary string would let anyone mint a valid-looking
  // cookie for a member who was never seated.
  const member = await sanityClient.fetch<{ _id: string; name: string; seat: string } | null>(
    `*[_type == "councilMember" && _id == $id && active == true][0]{_id, name, seat}`,
    { id }
  ).catch(() => null)

  if (!member) {
    return NextResponse.json(
      { error: 'Unknown or inactive council member.' },
      { status: 404 }
    )
  }

  const secret = identitySecret()
  // With no secret there is nothing to sign with, so we issue the bare id and
  // report demo-unsigned. The response makes the downgrade explicit rather than
  // leaving the caller to infer it from a missing signature.
  const value = secret === null ? id : signMemberId(id, secret)
  const auth = secret === null ? 'demo-unsigned' : 'signed'

  const jar = await cookies()
  jar.set(VIEWER_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    // Left off deliberately: the deployment is expected to be served over TLS,
    // and a cookie dropped on a plaintext dev origin is not a worse demo than a
    // readable one.
    secure: false,
  })

  return NextResponse.json({
    memberId: member._id,
    name: member.name,
    seat: member.seat,
    auth,
    demo: auth === 'demo-unsigned',
  })
}

/** DELETE /api/identity — sign out. */
export async function DELETE() {
  const jar = await cookies()
  jar.delete(VIEWER_COOKIE)
  return NextResponse.json({ signedOut: true })
}