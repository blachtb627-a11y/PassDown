import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { useAuth } from '../context/AuthContext';
import { WelcomeScreen } from '../screens/Auth/WelcomeScreen';
import { SignUpScreen } from '../screens/Auth/SignUpScreen';
import { LogInScreen } from '../screens/Auth/LogInScreen';
import { ForgotPasswordScreen } from '../screens/Auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/Auth/ResetPasswordScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { CookModeScreen } from '../screens/CookModeScreen';
import { PostRecipeScreen } from '../screens/PostRecipe/PostRecipeScreen';
import { ShoppingListScreen } from '../screens/ShoppingListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { FollowListScreen } from '../screens/FollowListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AdminPortalScreen } from '../screens/AdminPortalScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { CircleDetailScreen } from '../screens/CircleDetailScreen';
import { CircleMembersScreen } from '../screens/CircleMembersScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, isPasswordRecovery } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.secondary,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {isPasswordRecovery ? (
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
      ) : session ? (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Recipe' }} />
          <Stack.Screen name="CookMode" component={CookModeScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="PostRecipe"
            component={PostRecipeScreen}
            options={({ route }) => ({
              presentation: 'modal',
              title: route.params?.recipeId ? 'Edit Recipe' : 'Post a Recipe',
            })}
          />
          <Stack.Screen name="UserProfile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen
            name="FollowList"
            component={FollowListScreen}
            options={({ route }) => ({ title: route.params.title })}
          />
          <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Shopping List' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="AdminPortal" component={AdminPortalScreen} options={{ title: 'Admin Portal' }} />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ presentation: 'modal', title: 'Edit Profile' }}
          />
          <Stack.Screen
            name="CircleDetail"
            component={CircleDetailScreen}
            options={({ route }) => ({ title: route.params.name })}
          />
          <Stack.Screen name="CircleMembers" component={CircleMembersScreen} options={{ title: 'Members' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Sign Up' }} />
          <Stack.Screen name="LogIn" component={LogInScreen} options={{ title: 'Log In' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
