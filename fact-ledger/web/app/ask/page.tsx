import { BackLink } from '@/components/BackLink'
import { getQuestions, getFactOptions, getPageOptions } from '@/lib/voice'
import { QuestionForm } from '@/components/QuestionForm'
import { RoleAnswerBox } from '@/components/RoleAnswerBox'
import { VoiceAnalytics } from '@/components/VoiceAnalytics'
import { OfficialOnly } from '@/components/RoleView'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AskPage() {
  const [questions, facts, pages] = await Promise.all([getQuestions(), getFactOptions(), getPageOptions()])

  const open = questions.filter((q) => q.status === 'open').length
  const answered = questions.filter((q) => q.status === 'answered').length

  return (
    <div className="page-shell">
      <BackLink />
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Know your policy</div>
      <h1 className="page-title">Ask a Policy</h1>
      <p className="page-sub">
        <strong style={{ color: '#fff' }}>{open} open</strong> · {answered} answered: ask about any rule, officials answer with the canonical source.
      </p>

      <OfficialOnly>
        <VoiceAnalytics stats={{ qaFunnel: [{ name: 'Answered', value: answered }, { name: 'Open', value: open }] }} />
      </OfficialOnly>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        <div>
          <QuestionForm facts={facts} pages={pages} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {questions.map((q) => (
            <article key={q._id} className="page-card page-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge ${q.status === 'answered' ? 'badge-fixed' : 'badge-open'}`}>{q.status}</span>
                {(q.linkedFact || q.linkedPage) && (
                  <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                    About: {q.linkedFact?.label ?? q.linkedPage?.title}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: '#8b8b93', marginLeft: 'auto' }} suppressHydrationWarning>
                  {formatDate(q.askedAt)}
                </span>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem', lineHeight: 1.5 }}>
                {q.question}
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#8b8b93' }}>asked by {q.askedBy}</div>
              <RoleAnswerBox
                questionId={q._id}
                existingAnswer={q.answer}
                answeredBy={q.answeredBy}
                initialHelpful={q.helpful}
              />
            </article>
          ))}
          {questions.length === 0 && (
            <div className="page-card page-card-pad" style={{ textAlign: 'center', color: '#8b8b93' }}>
              No questions yet: ask the first one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
