import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'tmics7hc',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'fact-ledger',
  },
  autoUpdates: false,
})
