'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  _id: string
  name: string
  seat: string
}

// Demo identity switcher ("view as Priya, Arjun, Meera...").
//
// The cookie is httpOnly and HMAC-signed, so it cannot be written from here the
// way it used to be. We post the member id to /api/identity and let the server
// mint `<id>.<hmac>`. That is the whole point: a client that can set its own
// actor id is not an identity, it is a self-declared name.
export default function MemberSwitcher() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [current, setCurrent] = useState('')
  const [demo, setDemo] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    fetch('/api/members')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.members) setMembers(data.members)
      })
      .catch(() => undefined)

    // Ask the server who it thinks we are instead of reading the cookie: it is
    // httpOnly, and its value is `<id>.<hmac>`, not a member id.
    fetch('/api/identity', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setCurrent(data.identity?.memberId ?? '')
        setDemo(Boolean(data.demo))
      })
      .catch(() => undefined)
  }, [])

  async function pick(id: string) {
    setPending(true)
    setCurrent(id)
    try {
      await fetch('/api/identity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ memberId: id }),
      })
    } catch {
      // Leave the selection as-is; the next read of /api/identity is the truth.
    } finally {
      setPending(false)
    }
    router.refresh()
  }

  const me = members.find((m) => m._id === current)

  return (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}
      title={
        demo
          ? 'Demo identity - CC_IDENTITY_SECRET is unset, so every actor is recorded as unverified'
          : 'Demo identity - who your positions, votes and approvals are recorded as'
      }
    >
      <span
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Identity:
      </span>
      <select
        aria-label="View the app as a council member"
        value={current}
        disabled={pending}
        onChange={(e) => pick(e.target.value)}
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          color: me ? 'var(--gold-300)' : 'var(--text-muted)',
          fontSize: '0.78rem',
          padding: '6px 8px',
          maxWidth: '190px',
        }}
      >
        <option value="">View as...</option>
        {members.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name} · {m.seat}
          </option>
        ))}
      </select>
    </label>
  )
}