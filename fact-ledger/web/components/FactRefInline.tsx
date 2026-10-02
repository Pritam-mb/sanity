/**
 * factRef inline renderer for @portabletext/react.
 * Replaces a factRef block with the live canonical value from the fact document.
 *
 * The resolver is async at the page level: the page Server Component fetches
 * facts upfront and passes them as a lookup map here. This keeps rendering
 * pure and avoids waterfalls.
 */

export interface FactLookup {
  _id: string
  label: string
  value: string
  unit?: string
}

interface FactRefValue {
  _type: 'factRef'
  fact?: { _ref: string }
}

interface FactRefProps {
  value: FactRefValue
  factMap: Map<string, FactLookup>
}

export function FactRefInline({ value, factMap }: FactRefProps) {
  const ref = value.fact?._ref
  if (!ref) return <span className="fact-ref-error">[missing fact reference]</span>

  const fact = factMap.get(ref)
  if (!fact) return <span className="fact-ref-unresolved">[{ref}]</span>

  const display = [fact.value, fact.unit].filter(Boolean).join(' ')
  return (
    <span
      className="fact-ref-inline"
      data-fact-id={ref}
      title={`Fact: ${fact.label}`}
    >
      {display}
    </span>
  )
}

/**
 * Build the portabletext `types` component map for factRef.
 * Usage: <PortableText value={page.body} components={buildPtComponents(factMap)} />
 */
export function buildPtComponents(factMap: Map<string, FactLookup>) {
  return {
    types: {
      factRef: ({ value }: { value: FactRefValue }) => (
        <FactRefInline value={value} factMap={factMap} />
      ),
    },
  }
}
