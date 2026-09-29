import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './src/sanity/schemaTypes'
import { clauseDocumentActions } from './src/sanity/ClauseWorkflowActions'
import { deskStructure, defaultDocumentNode } from './src/sanity/structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id'
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  name: 'clause-court',
  title: 'Clause Court',
  projectId,
  dataset,
  // No `basePath`: the Studio runs as its own dev server via `npx sanity dev`
  // rather than being embedded into the Next.js app, so there is no `/studio`
  // route in the app router for it to mount at.

  plugins: [
    structureTool({
      structure: deskStructure,
      defaultDocumentNode,
    }),
    visionTool({ defaultApiVersion: '2024-01-01' }),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    // Clause documents get workflow actions instead of the default
    // publish/unpublish pair, so the state machine is the only way forward.
    actions: (prev, context) =>
      context.schemaType === 'clause' ? clauseDocumentActions(prev) : prev,
  },
})
