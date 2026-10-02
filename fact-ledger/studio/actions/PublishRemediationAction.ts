import { useClient } from 'sanity'
import { useState } from 'react'

export function PublishRemediationAction(props: any) {
  const { type, draft, published, onComplete } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  const [isPublishing, setIsPublishing] = useState(false)

  const doc = draft || published

  // Only apply to draft/approved remediations
  const canPublish = doc && doc.status !== 'published'

  return {
    label: isPublishing ? 'Applying Fixes...' : 'Apply Fixes & Publish',
    disabled: !canPublish || isPublishing,
    onHandle: async () => {
      if (!canPublish) return
      setIsPublishing(true)

      try {
        const tx = client.transaction()

        // 1. Apply each approved fix
        for (const fix of doc.fixes || []) {
          if (!fix.approved) continue

          try {
            const mutation = JSON.parse(fix.mutation)
            if (mutation.patch) {
              // Extract the target document ID and the set operation
              const targetId = mutation.patch.id
              const setOp = mutation.patch.set
              tx.patch(targetId, p => p.set(setOp))
            }

            // Mark finding as fixed
            if (fix.finding?._ref) {
              tx.patch(fix.finding._ref, p => p.set({ status: 'fixed', resolvedAt: new Date().toISOString() }))
            }
          } catch (err) {
            console.error('Error parsing fix mutation', err)
          }
        }

        // 2. Publish the remediation document itself
        const publishedId = doc._id.replace(/^drafts\./, '')
        tx.createIfNotExists({ ...doc, _id: publishedId, status: 'published' })
        tx.patch(publishedId, p => p.set({ status: 'published' }))
        
        if (draft) {
          tx.delete(draft._id)
        }

        // 3. Audit Log: release_published
        tx.create({
          _type: 'changeEvent',
          actor: 'Human Editor',
          action: 'release_published',
          at: new Date().toISOString(),
          releaseId: publishedId,
          after: JSON.stringify({ status: 'published', fixesCount: doc.fixes?.length || 0 })
        })

        await tx.commit()
      } catch (err) {
        console.error('Failed to publish remediation:', err)
        alert('Failed to publish. Check console.')
      } finally {
        setIsPublishing(false)
        onComplete()
      }
    }
  }
}
