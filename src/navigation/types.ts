export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  Tabs: undefined;
  RecipeDetail: { recipeId: string; focusComments?: boolean };
  CookMode: { recipeId: string };
  PostRecipe: { recipeId?: string } | undefined;
  UserProfile: { userId: string };
  FollowList: { userId: string; mode: 'followers' | 'following'; title: string };
  ShoppingList: undefined;
  Settings: undefined;
  AdminPortal: undefined;
  EditProfile: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Post: undefined;
  RecipeBox: undefined;
  Profile: undefined;
};
