import Link from 'next/link'
import { ArrowRight, Megaphone, MessageSquareWarning, CircleHelp, FileText } from 'lucide-react'
import { getUpdates, getComplaints, getQuestions } from '@/lib/voice'
import { sanityClient } from '@/lib/sanity/client'
import { VoiceAnalytics } from '@/components/VoiceAnalytics'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const [updates, complaints, questions, pageCount, factCount] = await Promise.all([
    getUpdates(),
    getComplaints(),
    getQuestions(),
    sanityClient.fetch<number>('count(*[_type=="page"])'),
    sanityClient.fetch<number>('count(*[_type=="fact" && status=="active"])'),
  ])

  const ranked = [...updates]
    .sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))
    .slice(0, 3)
  const openComplaints = complaints.filter((c) => c.status === 'open').length
  const openQuestions = questions.filter((q) => q.status === 'open').length

  const factCount_map = new Map<string, number>()
  complaints.forEach((c) => {
    const label = c.targetFact?.label ?? c.targetPage?.title ?? 'General'
    factCount_map.set(label, (factCount_map.get(label) ?? 0) + 1)
  })

  const cards = [
    { href: '/updates', icon: Megaphone, title: 'Updates & News', sub: `${updates.length} announcements · vote your view` },
    { href: '/ask', icon: CircleHelp, title: 'Ask a Policy', sub: `${openQuestions} open questions · get official answers` },
    { href: '/complaints', icon: MessageSquareWarning, title: 'Raise a Complaint', sub: `${openComplaints} open complaints · name the policy` },
    { href: '/pages', icon: FileText, title: 'Policy Library', sub: `${pageCount} pages · ${factCount} canonical values` },
  ]

  return (
    <div className="page-shell">
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Employee portal</div>
      <h1 className="page-title">Your Policy Workspace</h1>
      <p className="page-sub">
        Read official news, vote on changes, ask about any rule, and raise complaints that officials must triage.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
              <span className="list-row-card" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} />
                </span>
                <span>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: '0.95rem' }}>{c.title}</span>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#8b8b93', marginTop: 2 }}>{c.sub}</span>
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Open <ArrowRight size={13} />
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>Top-voted announcements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {ranked.map((u, i) => (
              <Link key={u._id} href="/updates" style={{ textDecoration: 'none' }}>
                <span className="list-row-card">
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#8b8b93' }}>0{i + 1}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem' }}>{u.title}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#8b8b93' }}>
                      +{u.upvotes} / −{u.downvotes} · net {u.upvotes - u.downvotes >= 0 ? '+' : ''}{u.upvotes - u.downvotes}
                    </span>
                  </span>
                  <ArrowRight size={15} style={{ color: '#fff' }} />
                </span>
              </Link>
            ))}
            {ranked.length === 0 && (
              <div className="page-card page-card-pad" style={{ color: '#8b8b93', fontSize: '0.85rem' }}>No announcements yet.</div>
            )}
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>Recently answered</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {questions.filter((q) => q.status === 'answered').slice(0, 3).map((q) => (
              <Link key={q._id} href="/ask" style={{ textDecoration: 'none' }}>
                <span className="list-row-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{q.question}</span>
                  <span style={{ fontSize: '0.8rem', color: '#d4d4d8' }}>{q.answer}</span>
                </span>
              </Link>
            ))}
            {questions.filter((q) => q.status === 'answered').length === 0 && (
              <div className="page-card page-card-pad" style={{ color: '#8b8b93', fontSize: '0.85rem' }}>No answers yet.</div>
            )}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>Most-complained policies</h2>
      <VoiceAnalytics
        stats={{
          complaintsByFact: [...factCount_map.entries()].map(([name, value]) => ({
            name: name.length > 18 ? `${name.slice(0, 18)}…` : name,
            value,
          })),
        }}
      />
    </div>
  )
}
