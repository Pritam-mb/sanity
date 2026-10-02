export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

/**
 * Official edits a canonical policy fact (the "Edit Policy" section).
 * Writes an audit changeEvent and returns; drift re-scan picks up the change.
 */
export async function POST(req: Request) {
  try {
    const { id, value, unit, aliases, status, editedBy } = (await req.json()) as {
      id?: string
      value?: string
      unit?: string
      aliases?: string[]
      status?: string
      editedBy?: string
    }
    if (!id || !value?.trim()) {
      return NextResponse.json({ error: 'Fact id and value are required' }, { status: 400 })
    }
    if (status && status !== 'active' && status !== 'deprecated') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const before = await sanityWriteClient.fetch(`*[_id == $id][0]{ value, unit, aliases, status }`, { id })
    const patch: Record<string, unknown> = { value: value.trim() }
    if (typeof unit === 'string') patch.unit = unit.trim()
    if (Array.isArray(aliases)) patch.aliases = aliases.map((a) => String(a).trim()).filter(Boolean)
    if (status) patch.status = status

    await sanityWriteClient.patch(id).set(patch).commit()
    await sanityWriteClient
      .create({
        _type: 'changeEvent',
        actor: editedBy?.trim() || 'Policy Office',
        action: 'fact_edited',
        target: { _type: 'reference', _ref: id },
        before: JSON.stringify(before ?? {}),
        after: JSON.stringify(patch),
        at: new Date().toISOString(),
      })
      .catch(() => null)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
