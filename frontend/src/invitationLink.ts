export function invitationLink(guest: { slug: string }) {
  return `${window.location.origin}/convite/${guest.slug}`
}
