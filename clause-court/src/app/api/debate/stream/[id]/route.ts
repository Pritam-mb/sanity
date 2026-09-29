import { sanityClient, CLAUSE_BY_ID_QUERY } from '@/lib/sanity/client'
import { detectAmbiguity } from '@/lib/ambiguity/detector'
import { runDebateStreaming } from '@/lib/debate/runDebate'
import { DebateQualityError } from '@/lib/debate/quality'
import type { AmbiguitySignal } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Live hearing over Server-Sent Events.
 *
 * Tokens are pushed to the browser as the model produces them, so the advocate
 * is visibly arguing rather than the page sitting blank. A few frames of
 * latency are far cheaper than a dead UI for the length of two arguments.
 *
 * Events:
 *   meta  — the clause and which precedent was put in front of the advocates
 *   start — an advocate has begun
 *   token — a fragment of that advocate's output
 *   done  — the hearing is complete, with document ids and stored content
 *   error — the hearing could not be held
 */
export async function GET(_request: Request, { params }: Props) {
  const { id } = await params

  const clause = await sanityClient
    .fetch<{ _id: string; text: string } | null>(CLAUSE_BY_ID_QUERY, { id })
    .catch(() => null)

  if (!clause) {
    return sse('error', { message: 'Clause not found' }, 404)
  }

  if (!process.env.GEMINI_API_KEY) {
    return sse(
      'error',
      { message: 'GEMINI_API_KEY is not configured on this server.' },
      503
    )
  }

  const signals: AmbiguitySignal[] = detectAmbiguity(clause.text ?? '', []).signals

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        send('meta', {
          clauseId: clause._id,
          signalCount: signals.length,
        })

        const result = await runDebateStreaming(
          clause._id,
          clause.text ?? '',
          signals,
          (side, token) => {
            if (controller.desiredSize !== null && token) {
              send('token', { side, text: token })
            }
          }
        )

        // The persisted documents are authoritative: the client renders what
        // was actually stored, not what the stream hoped it stored.
        const [storedA, storedB, storedPrecedents] = await Promise.all([
          sanityClient.getDocument(result.interpretationAId),
          sanityClient.getDocument(result.interpretationBId),
          result.citedPrecedentIds.length
            ? sanityClient.fetch<Array<{ _id: string; title: string; holding: string }>>(
                `*[_id in $ids]{_id, title, holding}`,
                { ids: result.citedPrecedentIds }
              )
            : Promise.resolve([]),
        ])

        send('done', {
          debateId: result.debateId,
          clauseId: clause._id,
          status: 'completed',
          interpretationA: {
            _id: storedA?._id ?? result.interpretationAId,
            side: 'A',
            title: result.interpretationA.title,
            summary: result.interpretationA.summary,
            argument: result.interpretationA.argument,
            textualEvidence: result.interpretationA.textualEvidence,
            citedPrecedent: result.interpretationA.precedentUsed,
          },
          interpretationB: {
            _id: storedB?._id ?? result.interpretationBId,
            side: 'B',
            title: result.interpretationB.title,
            summary: result.interpretationB.summary,
            argument: result.interpretationB.argument,
            textualEvidence: result.interpretationB.textualEvidence,
            citedPrecedent: result.interpretationB.precedentUsed,
          },
          citedPrecedentIds: result.citedPrecedentIds,
          citedPrecedent: storedPrecedents,
          relevantPrecedents: result.relevantPrecedents,
        })
      } catch (error) {
        if (error instanceof DebateQualityError) {
          send('error', {
            message: 'The advocates did not produce a usable hearing.',
            details: error.report.errors,
            warnings: error.report.warnings,
          })
        } else {
          send('error', {
            message:
              error instanceof Error ? error.message : 'The hearing failed.',
          })
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Stops nginx and friends buffering the stream into one lump.
      'X-Accel-Buffering': 'no',
    },
  })
}

/** Build a single-event SSE response, for failures detected before streaming. */
function sse(event: string, data: unknown, status: number) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      )
      controller.close()
    },
  })
  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}
