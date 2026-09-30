import { approvalType } from './approval'
import { clauseType } from './clause'
import { commentType } from './comment'
import { companyStandardType } from './companyStandard'
import { councilType } from './council'
import { councilMemberType } from './councilMember'
import { councilOptionType } from './councilOption'
import { debateType } from './debate'
import { definitionType } from './definition'
import { interpretationType } from './interpretation'
import { positionType } from './position'
import { precedentType } from './precedent'
import { regulationType } from './regulation'
import { rulingType } from './ruling'
import { sessionType } from './session'
import { voteType } from './vote'

export const schemaTypes = [
  clauseType,
  companyStandardType,
  councilType,
  councilMemberType,
  sessionType,
  positionType,
  commentType,
  councilOptionType,
  voteType,
  approvalType,
  definitionType,
  debateType,
  interpretationType,
  rulingType,
  precedentType,
  regulationType,
]
