import Link from 'next/link'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { getUpdates, getFactOptions, getPageOptions } from '@/lib/voice'
import { VoteButtons } from '@/components/VoteButtons'
import { UpdateComposer } from '@/components/UpdateComposer'
import { OfficialOnly } from '@/components/RoleView'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = {
  'policy-change': 'Policy change',
  news: 'News',
  notice: 'Notice',
}

export default async function UpdatesPage() {
  const [updates, facts, pages] = await Promise.all([getUpdates(), getFactOptions(), getPageOptions()])

  return (
    <div className="page-shell">
      <Link href="/portal" className="back-link">
        <ArrowLeft size={14} /> Back to Portal
      </Link>
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Official announcements</div>
      <h1 className="page-title">Updates &amp; News</h1>
      <p className="page-sub">
        What officials changed or announced — <strong style={{ color: '#fff' }}>{updates.length} published</strong>. Employees upvote what looks right, downvote concerns.
      </p>

      <OfficialOnly>
        <div style={{ marginBottom: '1.5rem', maxWidth: 720 }}>
          <UpdateComposer facts={facts} pages={pages} />
        </div>
      </OfficialOnly>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxWidth: 860 }}>
        {updates.map((u) => (
          <article key={u._id} className="page-card page-card-pad">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className="kind-chip">{KIND_LABEL[u.kind] ?? u.kind}</span>
              <span style={{ fontSize: '0.75rem', color: '#8b8b93' }} suppressHydrationWarning>
                {formatDate(u.publishedAt)} · {u.author ?? 'Policy Office'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>{u.title}</h2>
            <p style={{ fontSize: '0.9rem', color: '#d4d4d8', lineHeight: 1.65, marginBottom: '0.6rem' }}>{u.summary}</p>
            {(u.linkedFact || u.linkedPage) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                {u.linkedFact && (
                  <span style={{ fontSize: '11px', color: '#a1a1aa', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: '2px 9px', borderRadius: 100 }}>
                    Policy: {u.linkedFact.label}
                  </span>
                )}
                {u.linkedPage && (
                  <Link href={`/pages`} style={{ fontSize: '11px', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: '2px 9px', borderRadius: 100 }}>
                    Page: {u.linkedPage.title}
                  </Link>
                )}
              </div>
            )}
            <VoteButtons updateId={u._id} initialUp={u.upvotes} initialDown={u.downvotes} />
          </article>
        ))}
        {updates.length === 0 && (
          <div className="page-card page-card-pad" style={{ textAlign: 'center', color: '#8b8b93' }}>
            <Megaphone size={22} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
            No updates yet. Officials can post the first one above.
          </div>
        )}
      </div>
    </div>
  )
}
