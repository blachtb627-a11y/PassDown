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
  RecipeBox: undefined;
  CircleDetail: { circleId: string; name: string };
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Post: undefined;
  Circles: undefined;
  Profile: undefined;
};
