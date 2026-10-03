import { sanityClient } from '@/lib/sanity/client'

export interface PolicyUpdateDoc {
  _id: string
  title: string
  kind: string
  summary: string
  author?: string
  status: string
  upvotes: number
  downvotes: number
  publishedAt: string
  linkedFact?: { _id: string; label: string }
  linkedPage?: { _id: string; title: string; slug?: string }
}

export interface ComplaintDoc {
  _id: string
  title: string
  description: string
  category: string
  status: string
  raisedBy: string
  response?: string
  raisedAt: string
  resolvedAt?: string
  targetFact?: { _id: string; label: string }
  targetPage?: { _id: string; title: string }
}

export interface PolicyQuestionDoc {
  _id: string
  question: string
  askedBy: string
  status: string
  answer?: string
  answeredBy?: string
  helpful: number
  askedAt: string
  linkedFact?: { _id: string; label: string }
  linkedPage?: { _id: string; title: string }
}

export async function getUpdates(): Promise<PolicyUpdateDoc[]> {
  return sanityClient.fetch(
    `*[_type == "policyUpdate" && status == "published"] | order(publishedAt desc){
      _id, title, kind, summary, author, status,
      "upvotes": coalesce(upvotes, 0),
      "downvotes": coalesce(downvotes, 0),
      publishedAt,
      "linkedFact": linkedFact->{ _id, label },
      "linkedPage": linkedPage->{ _id, title, "slug": slug.current }
    }`
  )
}

export async function getComplaints(): Promise<ComplaintDoc[]> {
  return sanityClient.fetch(
    `*[_type == "complaint"] | order(raisedAt desc){
      _id, title, description, category, status, raisedBy, response, raisedAt, resolvedAt,
      "targetFact": targetFact->{ _id, label },
      "targetPage": targetPage->{ _id, title }
    }`
  )
}

export async function getQuestions(): Promise<PolicyQuestionDoc[]> {
  return sanityClient.fetch(
    `*[_type == "policyQuestion"] | order(askedAt desc){
      _id, question, askedBy, status, answer, answeredBy,
      "helpful": coalesce(helpful, 0),
      askedAt,
      "linkedFact": linkedFact->{ _id, label },
      "linkedPage": linkedPage->{ _id, title }
    }`
  )
}

export async function getFactOptions(): Promise<{ _id: string; label: string; value: string; unit?: string }[]> {
  return sanityClient.fetch(`*[_type == "fact" && status == "active"] | order(label asc){ _id, label, value, unit }`)
}

export async function getPageOptions(): Promise<{ _id: string; title: string }[]> {
  return sanityClient.fetch(`*[_type == "page"] | order(title asc){ _id, title }`)
}
