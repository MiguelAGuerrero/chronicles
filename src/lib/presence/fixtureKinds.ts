// @layer core

/*
 * The fixtures pack's kinds (specs/town-fixtures TF1; chronicles-data's contract v9, its fixtures schema): a source's own
 * vocabulary, so it is spelled here, in presence, beside every other table of a source's words (PS7: no module outside
 * presence spells one). The owner's thirteen (Nov 25, decisions 0255, 0268), in the contract's order. A fixture is a stop,
 * never a find: presence's classes and curation never read this list, and it gives a place no class, mark or weight.
 */
export const FIXTURE_KINDS = [
  'tourist_office', 'town_hall', 'library', 'post_office', 'square', 'market', 'station', 'bus_station', 'courthouse',
  'community_centre', 'ferry_terminal', 'common', 'bandstand',
] as const;
