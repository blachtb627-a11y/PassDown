export type RootStackParamList = {
  Tabs: undefined;
  RecipeDetail: { recipeId: string };
  CookMode: { recipeId: string };
  PostRecipe: { recipeId?: string } | undefined;
  UserProfile: { userId: string };
  ShoppingList: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Post: undefined;
  RecipeBox: undefined;
  Profile: undefined;
};
