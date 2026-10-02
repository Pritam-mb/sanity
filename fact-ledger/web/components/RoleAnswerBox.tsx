'use client'

import { AnswerBox } from './AnswerBox'
import { useRole } from './AppShell'

/** Role-aware answer box: officials can answer, everyone can vote helpful. */
export function RoleAnswerBox(props: {
  questionId: string
  existingAnswer?: string
  answeredBy?: string
  initialHelpful: number
}) {
  const [role] = useRole()
  return <AnswerBox {...props} canAnswer={role === 'official'} />
}
