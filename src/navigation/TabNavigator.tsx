import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TabParamList, RootStackParamList } from './types';
import { HomeFeedScreen } from '../screens/HomeFeedScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { RecipeBoxScreen } from '../screens/RecipeBoxScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/typography';

const Tab = createBottomTabNavigator<TabParamList>();

// Placeholder body for the "Post" tab — pressing it never shows this screen;
// the tabPress listener below intercepts it and pushes the posting flow instead.
function PostPlaceholder() {
  return <View />;
}

// The center Post button is the app's core action (brief section 7), so it gets its
// own oversized, colored, labeled control instead of the default icon+label stack.
function PostTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const selected = !!accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Post a recipe"
      style={styles.postButtonWrapper}
    >
      <View style={[styles.postButtonOuter, selected && styles.postButtonOuterActive]}>
        <Ionicons name="add" size={32} color={colors.white} />
      </View>
      <Text style={styles.postLabel}>Post</Text>
    </Pressable>
  );
}

export function TabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size }) => {
          const iconName: keyof typeof Ionicons.glyphMap =
            route.name === 'Home'
              ? 'home'
              : route.name === 'Search'
              ? 'search'
              : route.name === 'RecipeBox'
              ? 'file-tray-full'
              : route.name === 'Profile'
              ? 'person-circle'
              : 'add-circle';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeFeedScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: 'Search' }} />
      <Tab.Screen
        name="Post"
        component={PostPlaceholder}
        options={{
          tabBarButton: (props) => <PostTabButton {...props} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('PostRecipe', undefined);
          },
        }}
      />
      <Tab.Screen name="RecipeBox" component={RecipeBoxScreen} options={{ tabBarLabel: 'Recipe Box' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabLabel: {
    ...typography.meta,
    fontWeight: '600',
  },
  postButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  postButtonOuter: {
    top: -18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  postButtonOuterActive: {
    backgroundColor: colors.secondary,
  },
  postLabel: {
    ...typography.meta,
    fontWeight: '600',
    color: colors.primary,
    marginTop: -12,
  },
});
