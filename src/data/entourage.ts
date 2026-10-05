export type Person = { role?: string; symbol?: string; names: string[]; twoColumns?: boolean };
export type Group = { title?: string; layout: 'g1' | 'g2' | 'g3'; narrow?: boolean; people: Person[] };

export const ENTOURAGE: Group[] = [
  {
    layout: 'g2', narrow: true,
    people: [
      { role: 'Parents of the Bride', names: ['Mr. Cesar Rancap †', 'Mrs. Josephine Rancap'] },
      { role: 'Parents of the Groom', names: ['Col. Pacifico Lumauag Jr. †', 'Mrs. Margarette Lumauag'] },
    ],
  },
  { title: 'The Officiant', layout: 'g1', people: [{ names: ['Name of Officiant'] }] },
  {
    title: 'Principal Sponsors', layout: 'g2',
    people: [
      { role: 'Ninong', twoColumns: true, names: Array(8).fill('Name of Ninong') },
      { role: 'Ninang', twoColumns: true, names: Array(8).fill('Name of Ninang') },
    ],
  },
  {
    title: 'Secondary Sponsors', layout: 'g3',
    people: [
      { role: 'Candle', symbol: 'to light our path', names: ['Louie Jan Gabo', 'Maria Czarlette Trixia Rancap'] },
      { role: 'Veil', symbol: 'to light us as one', names: ['Benson Allam', 'Maria Czarina Allam'] },
      { role: 'Cord', symbol: 'to bind us together', names: ['Kristoffer Martin Dela Cruz', 'Nicole Alda Dela Cruz'] },
    ],
  },
  {
    title: 'Honor Attendants', layout: 'g2', narrow: true,
    people: [
      { role: 'Maid of Honor', names: ['Ma. Czarmane Rancap'] },
      { role: 'Best Men', names: ['Leonardo Khalil Faustino', 'Michael James Dela Cruz'] },
    ],
  },
  {
    title: 'Bearers', layout: 'g3',
    people: [
      { role: 'Ring Bearer', symbol: 'to carry our symbol of love', names: ['Kassidy Nylah Dela Cruz'] },
      { role: 'Bible Bearer', symbol: 'to carry our symbol of path', names: ['Jana Gabriela Lumauag'] },
      { role: 'Coin Bearer', symbol: 'to carry our symbol of treasure', names: ['Jana Emilia Antoinette Lumauag'] },
    ],
  },
  { title: 'Flower Girls', layout: 'g1', people: [{ names: ['Brienne Catriona Allam', 'Kelley Natalia Dela Cruz'] }] },
];
