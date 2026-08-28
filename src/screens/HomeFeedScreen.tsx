import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RecipeCard } from '../components/RecipeCard';
import { FilterChip } from '../components/FilterChip';
import { EmptyState } from '../components/EmptyState';
import { useAppState } from '../context/AppStateContext';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { getCuisineColor } from '../theme/cuisineColors';
import { radius, spacing } from '../theme/typography';
import { RootStackParamList } from '../navigation/types';

export function HomeFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { recipes, savedRecipeIds, likedRecipeIds, toggleSaveRecipe, toggleLikeRecipe } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);

  const publishedRecipes = useMemo(() => recipes.filter((r) => !r.isDraft), [recipes]);

  const cuisines = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of publishedRecipes) {
      const c = r.cuisine?.trim();
      if (c && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        list.push(c);
      }
    }
    return list.sort((a, b) => a.localeCompare(b));
  }, [publishedRecipes]);

  const visibleRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publishedRecipes.filter((r) => {
      if (selectedCuisine && r.cuisine !== selectedCuisine) return false;
      if (!q) return true;
      const haystack = [r.title, r.cuisine ?? '', ...r.ingredients.map((i) => i.item)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [publishedRecipes, query, selectedCuisine]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.banner}>
        <View style={styles.bannerTop}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/logo.png')} style={styles.logoMark} accessibilityIgnoresInvertColors />
            <Text style={styles.brandText}>PassDown</Text>
          </View>
          <View style={styles.bannerIcons}>
            <Pressable
              onPress={() => navigation.navigate('Circles')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Your Circles"
            >
              <Ionicons name="people-outline" size={24} color={colors.onHeaderBanner} />
            </Pressable>
            <Ionicons name="notifications-outline" size={24} color={colors.onHeaderBanner} accessibilityLabel="Notifications" />
          </View>
        </View>

        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, ingredients, tags..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.body}>
        <FlatList
          data={visibleRecipes}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          ListHeaderComponent={
            cuisines.length > 0 ? (
              <View style={styles.chipsRow}>
                <FilterChip label="All" selected={!selectedCuisine} onPress={() => setSelectedCuisine(null)} />
                {cuisines.map((c) => (
                  <FilterChip
                    key={c}
                    label={c}
                    selected={selectedCuisine === c}
                    color={getCuisineColor(c)}
                    onPress={() => setSelectedCuisine((prev) => (prev === c ? null : c))}
                  />
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="restaurant-outline"
              message={
                publishedRecipes.length === 0
                  ? 'No recipes yet — tap "Post" to share the first one!'
                  : 'No recipes matched — try a different search or cuisine.'
              }
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
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.headerBanner,
    },
    body: {
      flex: 1,
      backgroundColor: colors.background,
    },
    banner: {
      backgroundColor: colors.headerBanner,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    bannerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    bannerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    logoMark: { width: 30, height: 30 },
    brandText: { fontSize: 24, fontWeight: '700', color: colors.onHeaderBanner },
    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    searchInput: { flex: 1, color: colors.text, paddingVertical: spacing.sm },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingTop: spacing.md },
    columnWrapper: { gap: spacing.sm, paddingHorizontal: spacing.md },
    listContent: {
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
  });
}
