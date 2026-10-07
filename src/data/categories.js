export const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: 'LayoutGrid' },
  { id: 'tubers', name: 'Tubers & Roots (Yam, Cassava)', icon: 'Layers' },
  { id: 'grains', name: 'Grains & Cereals (Rice, Maize)', icon: 'Wheat' },
  { id: 'legumes', name: 'Legumes & Pulses (Soybeans, Beans)', icon: 'CircleDot' },
  { id: 'vegetables', name: 'Vegetables & Spices (Peppers, Tomatoes)', icon: 'Carrot' },
  { id: 'fruits', name: 'Fruits & Citrus (Oranges, Mangoes)', icon: 'Apple' },
  { id: 'livestock', name: 'Livestock & Cattle (Goats, Cows)', icon: 'Beef' },
  { id: 'poultry', name: 'Poultry & Eggs (Chickens, Eggs)', icon: 'Bird' },
  { id: 'fishery', name: 'Fish & Aquaculture (Catfish, Tilapia)', icon: 'Fish' },
  { id: 'processed', name: 'Processed Agro-Products (Garri, Oil)', icon: 'Package' }
];

/**
 * Normalizes legacy or database category strings to canonical category IDs.
 */
export function normalizeCategory(cat) {
  if (!cat) return 'tubers';
  const c = String(cat).toLowerCase().trim();
  if (c === 'tubers-roots' || c === 'tuber' || c === 'yam' || c === 'cassava') return 'tubers';
  if (c === 'grains-cereals' || c === 'grain' || c === 'cereal' || c === 'rice' || c === 'sesame') return 'grains';
  if (c === 'legumes-pulses' || c === 'legume' || c === 'beans' || c === 'soybeans' || c === 'groundnut') return 'legumes';
  if (c === 'vegetable' || c === 'veg' || c === 'pepper' || c === 'tomato') return 'vegetables';
  if (c === 'fruit' || c === 'citrus' || c === 'orange' || c === 'mango') return 'fruits';
  if (c === 'cattle' || c === 'goat' || c === 'sheep') return 'livestock';
  if (c === 'eggs' || c === 'chicken') return 'poultry';
  if (c === 'fish-aquaculture' || c === 'fish') return 'fishery';
  if (c === 'seeds-seedlings' || c === 'animal-feed' || c === 'farm-inputs' || c === 'other') return 'processed';
  return c;
}
