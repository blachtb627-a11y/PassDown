import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { useAuth } from '../context/AuthContext';
import { WelcomeScreen } from '../screens/Auth/WelcomeScreen';
import { SignUpScreen } from '../screens/Auth/SignUpScreen';
import { LogInScreen } from '../screens/Auth/LogInScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { CookModeScreen } from '../screens/CookModeScreen';
import { PostRecipeScreen } from '../screens/PostRecipe/PostRecipeScreen';
import { ShoppingListScreen } from '../screens/ShoppingListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.secondary,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {session ? (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Recipe' }} />
          <Stack.Screen name="CookMode" component={CookModeScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="PostRecipe"
            component={PostRecipeScreen}
            options={{ presentation: 'modal', title: 'Post a Recipe' }}
          />
          <Stack.Screen name="UserProfile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Shopping List' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Sign Up' }} />
          <Stack.Screen name="LogIn" component={LogInScreen} options={{ title: 'Log In' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
