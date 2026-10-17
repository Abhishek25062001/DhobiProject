// One-time migration of the original presentation. New labels belong to product records.
export function legacyGarmentPresentation(garment) {
  const name = garment?.name || '';
  if (/t-shirt|polo/i.test(name)) return { name: 'T-Shirt', kind: 'tshirt' };
  if (/shirt/i.test(name)) return { name: 'Shirt', kind: 'shirt' };
  if (/trouser|jeans/i.test(name)) return { name: 'Trousers', kind: 'trousers' };
  if (/kurti/i.test(name)) return { name: 'Kurti', kind: 'kurti' };
  if (/kurta/i.test(name)) return { name: 'Kurta', kind: 'kurti' };
  if (/saree/i.test(name)) return { name: 'Saree', kind: 'saree' };
  if (/salwar|kameez/i.test(name)) return { name: 'Salwar suit', kind: 'kurti' };
  if (/suit|blazer/i.test(name)) return { name: 'Suit / Blazer', kind: 'suit' };
  if (/dress|gown/i.test(name)) return { name: 'Dress', kind: 'kurti' };
  if (/single.*bedsheet/i.test(name)) return { name: 'Single bedsheet', kind: 'linen' };
  if (/bedsheet/i.test(name)) return { name: 'King bedsheet', kind: 'linen' };
  if (/towel/i.test(name)) return { name: 'Bath towel', kind: 'linen' };
  if (/curtain/i.test(name)) return { name: 'Curtain', kind: 'curtain' };
  if (/quilt|comforter|rajai/i.test(name)) return { name: 'Quilt / Rajai', kind: 'linen' };
  if (/jacket|sweater/i.test(name)) return { name: 'Jacket / Sweater', kind: 'suit' };
  return { name, kind: 'shirt' };
}


export const LEGACY_HOME_CARE_OPTIONS = [
  { id: 'wash', label: 'Wash', service: 'WASH_AND_FOLD', ironing: 'NONE', description: 'Washed, dried & neatly folded.', shortLabel: 'Wash & fold' },
  { id: 'steam', label: 'Steam Press', service: 'IRON_ONLY', ironing: 'STANDARD_STEAM', description: 'A smooth finish. No wash included.', shortLabel: 'Steam press' },
  { id: 'dry', label: 'Dry Clean', service: 'DRY_CLEAN', ironing: 'NONE', description: 'Specialist care for delicate pieces.', shortLabel: 'Dry clean' },
  { id: 'starch', label: 'Starch', service: 'IRON_ONLY', ironing: 'CRISP_STARCH', description: 'A crisp starch press for your cottons.', shortLabel: 'Starch press' },
];

