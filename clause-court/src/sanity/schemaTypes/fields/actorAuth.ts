import { defineField } from 'sanity'

/**
 * How the actor was proven when this record was written.
 *
 * `identity.ts` signs the actor cookie, but a signature is only worth something
 * if the record says whether one was checked. Without this field a vote cast
 * under an unsigned demo cookie is indistinguishable from one cast under a
 * verified identity, and the council's own history cannot be audited.
 *
 * Treat it as history: never back-fill `signed` onto an older record.
 */
export function actorAuthField() {
  return defineField({
    name: 'actorAuth',
    title: 'Identity strength',
    type: 'string',
    options: {
      list: [
        { title: 'Signed (verified HMAC cookie)', value: 'signed' },
        { title: 'Demo - unsigned id accepted', value: 'demo-unsigned' },
      ],
      layout: 'radio',
    },
    description:
      'Set by the server at write time. "Demo - unsigned" means CC_IDENTITY_SECRET was unset, so the member id was taken at face value. Do not edit this to make an older record look verified.',
  })
}