import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { schemaTypes } from './schemas'
import { structure } from './structure'
import { PublishRemediationAction } from './actions/PublishRemediationAction'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'tmics7hc'
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'fact-ledger'

export default defineConfig({
  name: 'fact-ledger',
  title: 'Fact Ledger',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'remediation') {
        // Replace the default publish action with our custom one
        return [PublishRemediationAction, ...prev.filter((a: any) => a.action !== 'publish')]
      }
      return prev
    }
  }
})
