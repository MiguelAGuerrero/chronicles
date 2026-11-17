// @layer core

/*
 * The leanings a journey may take (OJ17, OJ18): each a fixed set of chips and a name in words. The order is fixed and says nothing:
 * no leaning is preferred, ranked or compared, and a journey is told from another only by what it leans toward.
 */
export interface LeaningRow {
  id: string;
  name: string;
  chips: readonly string[];
}

export const LEANINGS: readonly LeaningRow[] = [
  { id: 'shops', name: 'Among the shops', chips: ['antiques', 'books', 'thrifting'] },
  { id: 'old', name: 'Past old places', chips: ['history', 'culture', 'art'] },
  { id: 'green', name: 'Through green', chips: ['parks', 'viewpoints'] },
];
