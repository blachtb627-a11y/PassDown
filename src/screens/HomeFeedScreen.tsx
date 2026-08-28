import React from 'react';
import { FlatList, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RecipeCard } from '../components/RecipeCard';
import { EmptyState } from '../components/EmptyState';
import { useAppState } from '../context/AppStateContext';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/typography';
import { RootStackParamList } from '../navigation/types';

export function HomeFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { recipes, savedRecipeIds, likedRecipeIds, toggleSaveRecipe, toggleLikeRecipe } = useAppState();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/logo.png')} style={styles.logoMark} accessibilityIgnoresInvertColors />
          <Text style={typography.display}>PassDown</Text>
        </View>
        <Ionicons name="notifications-outline" size={26} color={colors.secondary} accessibilityLabel="Notifications" />
      </View>
      <FlatList
        data={recipes.filter((r) => !r.isDraft)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            message='No recipes yet — tap "Post" to share the first one!'
          />
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            isSaved={savedRecipeIds.includes(item.id)}
            isLiked={likedRecipeIds.includes(item.id)}
            onToggleSave={() => toggleSaveRecipe(item.id)}
            onToggleLike={() => toggleLikeRecipe(item.id)}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
            onPressComments={() => navigation.navigate('RecipeDetail', { recipeId: item.id, focusComments: true })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: { width: 32, height: 32 },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
