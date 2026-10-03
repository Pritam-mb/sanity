import { redirect } from 'next/navigation'

/** Alias: the nav calls this section "Questions", so /questions must resolve. */
export default function QuestionsAlias() {
  redirect('/ask')
}
