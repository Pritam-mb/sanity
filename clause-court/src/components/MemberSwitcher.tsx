'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Must match VIEWER_COOKIE in src/lib/council/viewer.ts (kept as a literal
// because viewer.ts imports next/headers, which cannot enter a client bundle).
const VIEWER_COOKIE = 'cc_member'

interface Member {
  _id: string
  name: string
  seat: string
}

// Demo identity switcher ("view as Priya, Arjun, Meera…"). Real sign-in
// replaces this; every write still records the claimed member server-side.
export default function MemberSwitcher() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  // Read the cookie during initial state, not in an effect — effects are for
  // syncing with external systems, and this value is only needed once.
  const [current, setCurrent] = useState(() => {
    if (typeof document === 'undefined') return ''
    const match = document.cookie.match(new RegExp(`${VIEWER_COOKIE}=([^;]+)`))
    return match ? decodeURIComponent(match[1]) : ''
  })

  useEffect(() => {
    fetch('/api/members')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.members) setMembers(data.members)
      })
      .catch(() => undefined)
  }, [])

  function pick(id: string) {
    setCurrent(id)
    document.cookie = `${VIEWER_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000`
    router.refresh()
  }

  const me = members.find((m) => m._id === current)

  return (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}
      title="Demo identity — who your positions, votes and approvals are recorded as"
    >
      <span aria-hidden="true">🪪</span>
      <span className="sr-only">View the app as</span>
      <select
        aria-label="View the app as a council member"
        value={current}
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
        <option value="">View as…</option>
        {members.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name} · {m.seat}
          </option>
        ))}
      </select>
    </label>
  )
}
