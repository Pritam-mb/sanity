import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false, // real-time data for demo
  token: process.env.SANITY_API_TOKEN, // write access — server-side only
})

// Read-only client for client components (no token)
export const sanityReadClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

// =============================================
// GROQ QUERIES
// =============================================

export const CLAUSE_LIST_QUERY = `
  *[_type == "clause"] | order(_createdAt desc) {
    _id, _type, _createdAt, _updatedAt, _rev,
    title, text, category, status, caseNumber,
    ambiguitySignals,
    "definitionCount": count(definitions),
    "currentRuling": currentRuling->{
      _id, judgeName, customRuling, chosenInterpretation->{_id, title, side}
    },
    "citedPrecedent": citedPrecedent[]->{
      _id, title, holding, applicableTerms, relevanceScore
    }
  }
`

export const CLAUSE_BY_ID_QUERY = `
  *[_type == "clause" && _id == $id][0] {
    _id, _type, _createdAt, _updatedAt, _rev,
    title, text, category, status, caseNumber,
    ambiguitySignals,
    "definitions": definitions[]->{_id, term, definition, category},
    "citedPrecedent": citedPrecedent[]->{
      _id, title, holding, reasoning, applicableTerms,
      relevanceScore, citationCount,
      "ruling": ruling->{_id, judgeName, customRuling},
      "sourceClause": sourceClause->{_id, title, caseNumber}
    },
    "debates": debates[]->{
      _id, status, startedAt, completedAt,
      "interpretationA": interpretationA->{_id, title, summary, argument, textualEvidence, side},
      "interpretationB": interpretationB->{_id, title, summary, argument, textualEvidence, side}
    },
    "currentRuling": currentRuling->{
      _id, judgeName, customRuling, reasoning, dissent, dissentAdvocate,
      clauseRevisionSuggested, suggestedRevision, _createdAt,
      "chosenInterpretation": chosenInterpretation->{_id, title, side, summary}
    }
  }
`

export const DEBATE_BY_CLAUSE_QUERY = `
  *[_type == "debate" && clause._ref == $clauseId] | order(_createdAt desc) [0] {
    _id, status, startedAt, completedAt,
    "clause": clause->{_id, title, text, status, caseNumber, ambiguitySignals},
    "interpretationA": interpretationA->{
      _id, title, summary, argument, textualEvidence, side, precedentUsed,
      "citedPrecedent": citedPrecedent[]->{_id, title, holding}
    },
    "interpretationB": interpretationB->{
      _id, title, summary, argument, textualEvidence, side, precedentUsed,
      "citedPrecedent": citedPrecedent[]->{_id, title, holding}
    },
    "ruling": *[_type == "ruling" && debate._ref == ^._id][0]{
      _id, judgeName, customRuling, reasoning, dissent, dissentAdvocate,
      clauseRevisionSuggested, suggestedRevision, _createdAt,
      "chosenInterpretation": chosenInterpretation->{_id, title, side, summary},
      "precedent": precedent->{_id, title, holding, applicableTerms, relevanceScore, citationCount}
    }
  }
`

export const PRECEDENT_LIST_QUERY = `
  *[_type == "precedent"] | order(citationCount desc, _createdAt desc) {
    _id, _type, _createdAt,
    title, holding, reasoning, applicableTerms,
    relevanceScore, citationCount,
    "ruling": ruling->{_id, judgeName, customRuling, _createdAt},
    "sourceClause": sourceClause->{_id, title, text, category, caseNumber, status},
    "citesPrecedent": citesPrecedent[]->{_id, title, holding},
    "citedBy": *[_type == "clause" && references(^._id)]{_id, title, caseNumber, category}
  }
`

export const PRECEDENT_BY_ID_QUERY = `
  *[_type == "precedent" && _id == $id][0] {
    _id, _type, _createdAt,
    title, holding, reasoning, applicableTerms,
    relevanceScore, citationCount,
    "ruling": ruling->{
      _id, judgeName, customRuling, reasoning,
      dissent, dissentAdvocate, clauseRevisionSuggested, suggestedRevision,
      _createdAt,
      "chosenInterpretation": chosenInterpretation->{
        _id, title, side, summary, argument, textualEvidence,
        "citedPrecedent": citedPrecedent[]->{_id, title, holding}
      }
    },
    "sourceClause": sourceClause->{
      _id, title, text, category, caseNumber, status,
      ambiguitySignals
    },
    "citesPrecedent": citesPrecedent[]->{
      _id, title, holding, applicableTerms, citationCount
    },
    "citedBy": *[_type == "clause" && references(^._id)] | order(_createdAt asc) {
      _id, title, text, caseNumber, category, status
    }
  }
`

export const DASHBOARD_QUERY = `
  {
    "totalClauses": count(*[_type == "clause"]),
    "flaggedClauses": count(*[_type == "clause" && status == "flagged"]),
    "activeDebates": count(*[_type == "debate" && status == "active"]),
    "totalRulings": count(*[_type == "ruling"]),
    "totalPrecedents": count(*[_type == "precedent"]),
    "resolvedClauses": count(*[_type == "clause" && status in ["resolved", "published"]]),
    "recentRulings": *[_type == "ruling"] | order(_createdAt desc) [0...5] {
      _id, judgeName, customRuling, _createdAt,
      "clause": clause->{_id, title, caseNumber, status},
      "chosenInterpretation": chosenInterpretation->{_id, title, side}
    }
  }
`

// Every list projection is wrapped in coalesce(). An empty or absent array
// dereferences to `null` in GROQ, not `[]`, so a clause that cites no precedent
// would hand the client a null and any `.includes()` on it would throw. Coercing
// at the query keeps the null-shape out of the data rather than guarding for it
// in every consumer.
export const GRAPH_QUERY = `
  {
    "clauses": *[_type == "clause"] {
      _id, title, status, caseNumber,
      "citedPrecedentIds": coalesce(citedPrecedent[]._ref, []),
      "rulingIds": coalesce(*[_type == "ruling" && clause._ref == ^._id]._id, [])
    },
    "rulings": *[_type == "ruling"] {
      _id, judgeName, _createdAt,
      "clauseId": clause._ref
    },
    "precedents": *[_type == "precedent"] {
      _id, title, holding, citationCount,
      "rulingId": ruling._ref,
      "sourceClauseId": sourceClause._ref,
      "citesPrecedentIds": coalesce(citesPrecedent[]._ref, [])
    }
  }
`
