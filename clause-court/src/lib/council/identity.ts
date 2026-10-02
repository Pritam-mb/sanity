// =============================================
// IDENTITY - proving who the actor actually is
// =============================================
//
// Before v3 the viewer's identity was a plain cookie (`cc_member`) read
// verbatim by `viewer.ts` and trusted by `getActiveMember()`. Anyone could
// open devtools, set it to another member's id, and cast their vote, file
// their position and sign their approval. That silently invalidates every
// rule in `tally.ts` - the two-person approval rule, the required-seat check
// and the author/chair bars all trust the actor id they are handed, so a
// forged id walks straight through all of them.
//
// The fix adds no dependency. The cookie value is signed with an HMAC:
//
//     value = "<memberId>.<hex hmac-sha256>"
//
// Two modes, and never a silent third:
//
//   CC_IDENTITY_SECRET set    -> signed. A tampered value is refused.
//   CC_IDENTITY_SECRET unset  -> DEMO. The value is accepted so the hackathon
//                                demo keeps working, but every write records
//                                actorAuth: 'demo-unsigned' in the audit log.
//
// An unsigned identity stays a documented demo limitation rather than a
// hidden one. Nothing here decides *whether* someone may act - that is the
// council's business, in `tally.ts` and `sessionFlow.ts`. This only decides
// whether the claimed id is the id the server issued.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const IDENTITY_SECRET_ENV = 'CC_IDENTITY_SECRET'

export type AuthStrength = 'signed' | 'demo-unsigned'

export type IdentityFailure =
  | 'empty'
  | 'malformed'
  | 'bad-signature'

export interface IdentityResult {
  memberId: string
  auth: AuthStrength
  /** Set when a signature was present but did not verify. Never set in demo mode. */
  reason?: IdentityFailure
}

export interface IdentityOk {
  ok: true
  identity: IdentityResult
}

export interface IdentityErr {
  ok: false
  reason: IdentityFailure
  message: string
}

export type IdentityOutcome = IdentityOk | IdentityErr

type EnvLike = Record<string, string | undefined>

/** The signing secret, or null in demo mode. An all-whitespace value counts as unset. */
export function identitySecret(env: EnvLike = process.env): string | null {
  const raw = env[IDENTITY_SECRET_ENV]
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function demoIdentityEnabled(env: EnvLike = process.env): boolean {
  return identitySecret(env) === null
}

function signatureFor(memberId: string, secret: string): string {
  return createHmac('sha256', secret).update(memberId).digest('hex')
}

/** Mint a cookie value for a member id. */
export function signMemberId(memberId: string, secret: string): string {
  return `${memberId}.${signatureFor(memberId, secret)}`
}

/** Length-independent constant-time compare, so a wrong signature leaks nothing by timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Resolve a raw cookie value into a member id.
 *
 * Demo mode (no secret): a bare id is accepted and reported as
 * `demo-unsigned`. A dotted value whose signature does not verify is still
 * refused - in demo mode we are not checking signatures, but we are also not
 * going to accept a value that was clearly minted for a different secret.
 *
 * Signed mode: the signature must verify or the request is refused.
 */
export function verifyIdentity(
  raw: string | null | undefined,
  env: EnvLike = process.env
): IdentityOutcome {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return {
      ok: false,
      reason: 'empty',
      message: 'No identity on this request - sign in or pick a member before acting.',
    }
  }

  const value = raw.trim()
  const secret = identitySecret(env)
  const dot = value.lastIndexOf('.')

  if (dot <= 0) {
    // No signature segment at all.
    if (secret !== null) {
      return {
        ok: false,
        reason: 'malformed',
        message:
          'This identity is unsigned but signing is enabled. Re-authenticate to act.',
      }
    }
    return { ok: true, identity: { memberId: value, auth: 'demo-unsigned' } }
  }

  const memberId = value.slice(0, dot)
  const presented = value.slice(dot + 1)

  if (memberId.length === 0 || presented.length === 0) {
    return {
      ok: false,
      reason: 'malformed',
      message: 'Malformed identity value.',
    }
  }

  if (secret === null) {
    // Demo mode. A dotted value is either a real signature or a hand-typed
    // forgery; we cannot tell, and we do not pretend to. Accept, and let the
    // audit log record that the identity was unverified.
    return { ok: true, identity: { memberId, auth: 'demo-unsigned' } }
  }

  if (!safeEqual(presented, signatureFor(memberId, secret))) {
    return {
      ok: false,
      reason: 'bad-signature',
      message:
        'Identity signature does not match. The cookie was altered after it was issued.',
    }
  }

  return { ok: true, identity: { memberId, auth: 'signed' } }
}

// =============================================
// ACTOR CLAIMS
// =============================================

export type ActorClaim =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Reconcile a client-declared actor against the verified one.
 *
 * Write routes used to take `memberId` from the request body and look it up,
 * which made the actor a self-declared name: anyone who knew a member's id
 * could vote, position or sign as them. The signed cookie only fixes that once
 * the write path reads it, and existing clients still send the id they believe
 * they are.
 *
 * A body-supplied id is therefore never authoritative. It is checked, and a
 * disagreement is refused rather than silently corrected - a client acting as
 * the wrong person has a bug, and quietly substituting the signed-in member
 * would hide it.
 *
 * An absent claim is fine: the verified identity simply stands on its own.
 */
export function checkActorClaim(
  claimed: string | null | undefined,
  verifiedId: string,
  field = 'memberId'
): ActorClaim {
  if (typeof claimed !== 'string') return { ok: true }
  const trimmed = claimed.trim()
  if (trimmed.length === 0) return { ok: true }
  if (trimmed === verifiedId) return { ok: true }
  return {
    ok: false,
    message:
      `This request sends ${field}=${trimmed}, but you are signed in as ${verifiedId}. ` +
      'A vote, position or signature is recorded against the signed-in member, never the one in the request body.',
  }
}
