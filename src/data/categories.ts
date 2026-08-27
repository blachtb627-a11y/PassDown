// Placeholder photos standing in for real category imagery.
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/900/1125`;

export const categories = [
  { id: 'cat1', label: 'Breakfast', photoUri: photo('cat-breakfast') },
  { id: 'cat2', label: 'Dinner', photoUri: photo('cat-dinner') },
  { id: 'cat3', label: 'Dessert', photoUri: photo('cat-dessert') },
  { id: 'cat4', label: 'Quick & Easy', photoUri: photo('cat-quick') },
  { id: 'cat5', label: 'Holiday', photoUri: photo('cat-holiday') },
  { id: 'cat6', label: 'Vegetarian', photoUri: photo('cat-veg') },
];
