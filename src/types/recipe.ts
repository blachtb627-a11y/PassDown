export type Ingredient = {
  id: string;
  quantity: string;
  unit: string;
  item: string;
};

export type Step = {
  id: string;
  text: string;
  photoUri?: string;
  timerMinutes?: number;
};

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Dessert' | 'Snack' | 'Drink';
export type Diet = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Dairy-Free' | 'None';
export type Difficulty = 'Easy' | 'Medium' | 'Advanced';
export type Occasion = 'Weeknight' | 'Holiday' | 'Potluck' | 'Special Occasion';

export type Author = {
  id: string;
  name: string;
  username: string;
  avatarUri?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
};

export type MadeThisPost = {
  id: string;
  authorName: string;
  photoUri: string;
  note?: string;
};

export type Comment = {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type Recipe = {
  id: string;
  title: string;
  story?: string;
  photos: string[];
  author: Author;
  ingredients: Ingredient[];
  steps: Step[];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  cuisine?: string;
  mealType?: MealType;
  diet?: Diet;
  difficulty?: Difficulty;
  occasion?: Occasion;
  likeCount: number;
  commentCount: number;
  comments: Comment[];
  madeThisPosts: MadeThisPost[];
  isDraft?: boolean;
  createdAt: string;
};

export type Collection = {
  id: string;
  name: string;
  recipeIds: string[];
};

export type ShoppingListItem = {
  id: string;
  item: string;
  quantity: string;
  unit: string;
  checked: boolean;
  fromRecipeIds: string[];
};
