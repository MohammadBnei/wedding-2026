/**
 * What the RSVP headcount picker offers, and the bound the server clamps to.
 *
 * The largest invites on the guest list bring six and five, which the original
 * 1-4 picker silently under-counted. These have to agree across the trust
 * boundary in one specific direction: if the chips offer more than the server
 * allows, the extra heads are not rejected — they are saved as 1, and nobody
 * finds out until the catering numbers do. So it is one list, and the server's
 * bound is derived from it rather than written out again.
 */
export const COUNTS = [1, 2, 3, 4, 5, 6];

export const MAX_COUNT = COUNTS[COUNTS.length - 1];
