import { factSchema } from './fact'
import { personSchema } from './person'
import { factRefSchema } from './factRef'
import { pageSchema } from './page'
import { findingSchema } from './finding'
import { scanRunSchema } from './scanRun'
import { changeEventSchema } from './changeEvent'
import { benchmarkResultSchema } from './benchmarkResult'
import { remediationSchema } from './remediation'

export const schemaTypes = [
  // Core data model
  personSchema,
  factSchema,
  factRefSchema,
  pageSchema,
  // Scanner output
  findingSchema,
  scanRunSchema,
  changeEventSchema,
  benchmarkResultSchema,
  remediationSchema,
]
