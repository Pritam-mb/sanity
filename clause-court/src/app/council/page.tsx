import Link from 'next/link'
import { sanityClient } from '@/lib/sanity/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CouncilRow {
  name: string
  description: string
  seats: string[]
  quorumPct: number
  thresholdPct: number
  requiredSeats: string[]
  chairName: string | null
}

interface MemberRow {
  _id: string
  name: string
  seat: string
  active: boolean
  bio: string | null
  positions: number
  votes: number
}

// Members, seats, and participation history.
export default async function CouncilPage() {
  const council = await sanityClient
    .fetch<CouncilRow | null>(
      `*[_type == "council"][0]{
        name, description, seats,
        "quorumPct": coalesce(quorumPct, 60),
        "thresholdPct": coalesce(thresholdPct, 50),
        "requiredSeats": coalesce(requiredSeats, []),
        "chairName": chair->name
      }`
    )
    .catch(() => null)

  const members = await sanityClient
    .fetch<MemberRow[]>(
      `*[_type == "councilMember"] | order(name asc) {
        _id, name, seat, active, bio,
        "positions": count(*[_type == "position" && member._ref == ^._id]),
        "votes": count(*[_type == "vote" && member._ref == ^._id])
      }`
    )
    .catch(() => [])

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container container--narrow">
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: '8px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)' }}>Dashboard</Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--gold-400)' }}>Council</span>
        </nav>

        <div className="court-case-number">THE POLICY COUNCIL</div>
        <h1 style={{ marginBottom: '8px' }}>{council?.name ?? 'Council'}</h1>
        <p style={{ maxWidth: '640px', marginBottom: '20px' }}>
          {council?.description ?? 'No council configured yet.'}
        </p>

        {council && (
          <div className="card card--gold" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <RuleStat label="Quorum" value={`${council.quorumPct}%`} />
              <RuleStat label="Threshold" value={`${council.thresholdPct}%`} />
              <RuleStat label="Required seats" value={council.requiredSeats.join(', ') || '—'} />
              <RuleStat label="Chair" value={council.chairName ?? '—'} />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px' }}>
              The chair runs procedure and cannot override a vote. Required seats must be heard —
              a convenient majority cannot bypass the experts.
            </p>
          </div>
        )}

        <h3 style={{ marginBottom: '14px' }}>Seats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {members.map((m) => (
            <div key={m._id} className="card" style={{ opacity: m.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong>{m.name}</strong>
                <span className={`badge ${m.active ? 'badge--resolved' : 'badge--draft'}`}>{m.seat}</span>
              </div>
              {m.bio && <p style={{ fontSize: '0.82rem', marginBottom: '8px' }}>{m.bio}</p>}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {m.positions} position{m.positions === 1 ? '' : 's'} · {m.votes} vote{m.votes === 1 ? '' : 's'}
                {!m.active && ' · inactive'}
              </p>
            </div>
          ))}
          {members.length === 0 && (
            <div className="card"><p style={{ color: 'var(--text-muted)' }}>No members yet — reseed the demo.</p></div>
          )}
        </div>
      </div>
    </div>
  )
}

function RuleStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: '700', color: 'var(--gold-300)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}
