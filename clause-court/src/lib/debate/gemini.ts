import { GoogleGenerativeAI } from '@google/generative-ai'
import { DebateOutput, DissentOutput, InterpretationOutput, Precedent, AdvocateSide } from '@/types'

// =============================================
// GEMINI CLIENT — server-side only
// =============================================

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return new GoogleGenerativeAI(apiKey)
}

// =============================================
// ADVOCATE PROMPTS
// =============================================

function buildAdvocateAPrompt(
  clauseText: string,
  ambiguitySignals: Array<{ term: string; message: string }>,
  precedents: Precedent[]
): string {
  const precedentContext = precedents.length > 0
    ? `\n\nRELEVANT PRIOR RULINGS (structured precedent — cite only these, do not fabricate):\n${precedents.map((p, i) =>
        `[Precedent ${i + 1}]: "${p.title}" — Holding: ${p.holding}. Applicable terms: ${p.applicableTerms.join(', ')}.`
      ).join('\n')}`
    : '\n\nNO PRIOR PRECEDENT EXISTS for this clause. This will be a first ruling.'

  return `You are Advocate A in a structured-content courtroom called Clause Court.

Your task is to construct the strongest defensible interpretation of the clause below.

CLAUSE TEXT:
"${clauseText}"

IDENTIFIED AMBIGUITY SIGNALS:
${ambiguitySignals.map((s) => `- Term: "${s.term}" — ${s.message}`).join('\n')}
${precedentContext}

STRICT RULES:
1. Use ONLY the supplied clause text and supplied precedent above.
2. Identify exact textual evidence — quote exact phrases from the clause.
3. Do NOT invent facts, legal sources, or precedent not listed above.
4. Produce a materially DIFFERENT interpretation from what an opposing advocate might argue — favor the user/customer/employee perspective.
5. Do NOT issue the final ruling.
6. If precedent is supplied, explicitly explain how it SUPPORTS your reading.
7. Keep your argument focused on the ambiguous term(s) identified.

Return ONLY valid JSON in this exact structure:
{
  "title": "Short title for your interpretation (max 10 words)",
  "summary": "One sentence summary of your position",
  "argument": "Your full argument (150-250 words), citing exact clause text and any relevant precedent",
  "textualEvidence": ["exact quote 1 from clause", "exact quote 2"],
  "precedentUsed": ["Precedent title if used, or empty array"]
}`
}

function buildAdvocateBPrompt(
  clauseText: string,
  ambiguitySignals: Array<{ term: string; message: string }>,
  precedents: Precedent[],
  interpretationA: InterpretationOutput
): string {
  const precedentContext = precedents.length > 0
    ? `\n\nRELEVANT PRIOR RULINGS (cite only these):\n${precedents.map((p, i) =>
        `[Precedent ${i + 1}]: "${p.title}" — Holding: ${p.holding}. Applicable terms: ${p.applicableTerms.join(', ')}.`
      ).join('\n')}`
    : '\n\nNO PRIOR PRECEDENT EXISTS.'

  return `You are Advocate B in a structured-content courtroom called Clause Court.

Your task is to construct the strongest OPPOSING interpretation of the clause below.

CLAUSE TEXT:
"${clauseText}"

IDENTIFIED AMBIGUITY SIGNALS:
${ambiguitySignals.map((s) => `- Term: "${s.term}" — ${s.message}`).join('\n')}
${precedentContext}

ADVOCATE A'S POSITION (which you must challenge):
${interpretationA.argument}

STRICT RULES:
1. Use ONLY the supplied clause text and supplied precedent above.
2. Identify exact textual evidence — quote exact phrases from the clause.
3. Do NOT invent facts, legal sources, or precedent not listed above.
4. Construct a materially DIFFERENT interpretation — favor the operational/company/institutional perspective.
5. Challenge the assumptions in Advocate A's argument where valid.
6. Do NOT issue the final ruling.
7. If precedent is supplied, explain how it may be DISTINGUISHED or may support your reading.

Return ONLY valid JSON in this exact structure:
{
  "title": "Short title for your interpretation (max 10 words)",
  "summary": "One sentence summary of your position",
  "argument": "Your full argument (150-250 words), citing exact clause text and challenging Advocate A's reading",
  "textualEvidence": ["exact quote 1 from clause", "exact quote 2"],
  "precedentUsed": ["Precedent title if used, or empty array"]
}`
}

function buildDissentPrompt(
  clauseText: string,
  ruling: string,
  losingAdvocate: AdvocateSide,
  losingArgument: string
): string {
  return `You are the losing advocate in a structured-content courtroom called Clause Court.

The human judge has issued a ruling that went against your interpretation.

CLAUSE TEXT:
"${clauseText}"

HUMAN JUDGE'S RULING:
"${ruling}"

YOUR (LOSING) ARGUMENT:
${losingArgument}

Your task is to write a respectful DISSENT — acknowledging the ruling while noting its potential operational implications or suggesting a clause revision.

STRICT RULES:
1. Do NOT overturn, minimize, or contradict the ruling — it stands.
2. Focus on practical implications or improvement suggestions.
3. This is clearly labeled as a generated opinion, not a legal finding.
4. Keep the dissent to 60-100 words.
5. Be constructive, not combative.

Return ONLY valid JSON:
{
  "losingAdvocate": "${losingAdvocate}",
  "dissent": "Your dissent text (60-100 words)",
  "clauseRevisionSuggested": true or false,
  "suggestedRevision": "Suggested rewrite of the ambiguous portion, or null if not applicable"
}`
}

// =============================================
// GENERATE DEBATE (STREAMING)
// =============================================

export async function generateDebateStream(
  clauseId: string,
  clauseText: string,
  ambiguitySignals: Array<{ term: string; message: string }>,
  precedents: Precedent[],
  onChunkA: (chunk: string) => void,
  onChunkB: (chunk: string) => void,
): Promise<DebateOutput> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Generate Advocate A first (for context to give B)
  const promptA = buildAdvocateAPrompt(clauseText, ambiguitySignals, precedents)
  let rawA = ''

  const streamA = await model.generateContentStream(promptA)
  for await (const chunk of streamA.stream) {
    const text = chunk.text()
    rawA += text
    onChunkA(text)
  }

  // Parse A
  const interpretationA = parseInterpretation(rawA)

  // Generate Advocate B with A's context
  const promptB = buildAdvocateBPrompt(clauseText, ambiguitySignals, precedents, interpretationA)
  let rawB = ''

  const streamB = await model.generateContentStream(promptB)
  for await (const chunk of streamB.stream) {
    const text = chunk.text()
    rawB += text
    onChunkB(text)
  }

  const interpretationB = parseInterpretation(rawB)

  return {
    clauseId,
    interpretationA,
    interpretationB,
  }
}

// =============================================
// GENERATE A SINGLE ADVOCATE (STREAMING)
// =============================================

/**
 * Stream one advocate's argument, token by token.
 *
 * Used by the SSE route so the browser can type the hearing out live instead
 * of waiting on a blocking request. The advocate still speaks in JSON, so the
 * caller receives the raw token stream for display and the parsed
 * `InterpretationOutput` when the stream ends. Streaming is what makes the
 * courtroom feel live; parsing afterwards is what keeps the stored document
 * structured.
 */
export async function generateInterpretationStream(
  side: AdvocateSide,
  clauseText: string,
  ambiguitySignals: Array<{ term: string; message: string }>,
  precedents: Precedent[],
  onToken: (token: string) => void,
  opposingArgument?: string
): Promise<InterpretationOutput> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt =
    side === 'A'
      ? buildAdvocateAPrompt(clauseText, ambiguitySignals, precedents)
      : buildAdvocateBPrompt(
          clauseText,
          ambiguitySignals,
          precedents,
          // B is streamed with A's parsed argument as its opposition.
          { argument: opposingArgument ?? '' } as InterpretationOutput
        )

  const stream = await model.generateContentStream(prompt)
  let raw = ''

  for await (const chunk of stream.stream) {
    const text = chunk.text()
    if (text) {
      raw += text
      onToken(text)
    }
  }

  return parseInterpretation(raw)
}

// =============================================
// GENERATE DEBATE (NON-STREAMING, for API routes)
// =============================================

export async function generateDebate(
  clauseId: string,
  clauseText: string,
  ambiguitySignals: Array<{ term: string; message: string }>,
  precedents: Precedent[]
): Promise<DebateOutput> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  // Generate A
  const promptA = buildAdvocateAPrompt(clauseText, ambiguitySignals, precedents)
  const resultA = await model.generateContent(promptA)
  const interpretationA = parseInterpretation(resultA.response.text())

  // Generate B (with A's context for opposition)
  const promptB = buildAdvocateBPrompt(clauseText, ambiguitySignals, precedents, interpretationA)
  const resultB = await model.generateContent(promptB)
  const interpretationB = parseInterpretation(resultB.response.text())

  // Validate they are materially different
  if (areTooSimilar(interpretationA.argument, interpretationB.argument)) {
    // Retry B once with stronger instruction
    const retryPromptB = promptB + '\n\nCRITICAL: Your previous attempt was too similar to Advocate A. You MUST argue from a completely different perspective.'
    const retryB = await model.generateContent(retryPromptB)
    return {
      clauseId,
      interpretationA,
      interpretationB: parseInterpretation(retryB.response.text()),
    }
  }

  return { clauseId, interpretationA, interpretationB }
}

// =============================================
// GENERATE DISSENT
// =============================================

export async function generateDissent(
  clauseText: string,
  ruling: string,
  losingAdvocate: AdvocateSide,
  losingArgument: string
): Promise<DissentOutput> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = buildDissentPrompt(clauseText, ruling, losingAdvocate, losingArgument)
  const result = await model.generateContent(prompt)

  try {
    const raw = result.response.text()
    const parsed = JSON.parse(extractJSON(raw))
    return {
      losingAdvocate: parsed.losingAdvocate || losingAdvocate,
      dissent: parsed.dissent || '',
      clauseRevisionSuggested: parsed.clauseRevisionSuggested || false,
      suggestedRevision: parsed.suggestedRevision || undefined,
    }
  } catch {
    return {
      losingAdvocate,
      dissent: 'The losing advocate respectfully dissents and recommends reviewing the clause language for greater precision.',
      clauseRevisionSuggested: true,
      suggestedRevision: undefined,
    }
  }
}

// =============================================
// HELPERS
// =============================================

function extractJSON(text: string): string {
  // Try to extract JSON from code fences or raw text
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]

  return text.trim()
}

function parseInterpretation(raw: string): InterpretationOutput {
  try {
    const parsed = JSON.parse(extractJSON(raw))
    return {
      title: parsed.title || 'Interpretation',
      summary: parsed.summary || '',
      argument: parsed.argument || '',
      textualEvidence: Array.isArray(parsed.textualEvidence) ? parsed.textualEvidence : [],
      precedentUsed: Array.isArray(parsed.precedentUsed) ? parsed.precedentUsed : [],
    }
  } catch {
    // Fallback: try to extract readable content
    return {
      title: 'Generated Interpretation',
      summary: 'AI interpretation generated',
      argument: raw.substring(0, 500),
      textualEvidence: [],
      precedentUsed: [],
    }
  }
}

function areTooSimilar(a: string, b: string): boolean {
  // Simple Jaccard similarity on word sets
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 4))
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 4))

  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size

  const similarity = union === 0 ? 0 : intersection / union
  return similarity > 0.75 // 75% word overlap is too similar
}
