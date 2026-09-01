import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RecipeCard } from '../components/RecipeCard';
import { AdCard } from '../components/AdCard';
import { DropdownButton } from '../components/DropdownButton';
import { SelectModal } from '../components/SelectModal';
import { EmptyState } from '../components/EmptyState';
import { useAppState } from '../context/AppStateContext';
import { Ad, fetchActiveAd, recordAdView } from '../lib/api/ads';
import { countries } from '../data/countries';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/typography';
import { RootStackParamList } from '../navigation/types';
import { MealType } from '../types/recipe';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drink'];

type FeedTab = 'public' | 'following';

export function HomeFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { recipes, savedRecipeIds, likedRecipeIds, followedAuthorIds, toggleSaveRecipe, toggleLikeRecipe } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [feedTab, setFeedTab] = useState<FeedTab>('public');
  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [isCuisineModalOpen, setIsCuisineModalOpen] = useState(false);
  const [isMealTypeModalOpen, setIsMealTypeModalOpen] = useState(false);
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    // Ads are a separate, best-effort feature here — if none is running, or
    // the fetch fails, the feed itself should still work fine with no ad
    // shown. One ad is picked per feed load, and counts as one view then.
    let cancelled = false;
    fetchActiveAd()
      .then((result) => {
        if (cancelled || !result) return;
        setAd(result);
        recordAdView(result.id).catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedRecipes = useMemo(() => recipes.filter((r) => !r.isDraft), [recipes]);

  const visibleRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publishedRecipes.filter((r) => {
      if (feedTab === 'following' && !followedAuthorIds.includes(r.author.id)) return false;
      if (selectedCuisine && r.cuisine !== selectedCuisine) return false;
      if (selectedMealType && r.mealType !== selectedMealType) return false;
      if (!q) return true;
      const haystack = [r.title, r.cuisine ?? '', r.mealType ?? '', ...r.ingredients.map((i) => i.item)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [publishedRecipes, query, selectedCuisine, selectedMealType, feedTab, followedAuthorIds]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.banner}>
        <View style={styles.bannerTop}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/logo.png')} style={styles.logoMark} accessibilityIgnoresInvertColors />
            <Text style={[typography.wordmark, styles.brandText]}>PassDown</Text>
          </View>
          <View style={styles.bannerIcons}>
            <Pressable
              onPress={() => navigation.navigate('ShoppingList')}
              accessibilityRole="button"
              accessibilityLabel="Shopping List"
              style={styles.cartButton}
            >
              <Ionicons name="cart-outline" size={24} color={colors.onHeaderBanner} />
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
          contentContainerStyle={styles.listContent}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          ListHeaderComponent={
            <>
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tabButton, feedTab === 'public' && styles.tabButtonActive]}
                  onPress={() => setFeedTab('public')}
                  accessibilityRole="button"
                  accessibilityLabel="Public feed"
                  accessibilityState={{ selected: feedTab === 'public' }}
                >
                  <Text style={[typography.bodyBold, feedTab === 'public' ? styles.tabTextActive : styles.tabTextInactive]}>
                    Public
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tabButton, feedTab === 'following' && styles.tabButtonActive]}
                  onPress={() => setFeedTab('following')}
                  accessibilityRole="button"
                  accessibilityLabel="Following feed"
                  accessibilityState={{ selected: feedTab === 'following' }}
                >
                  <Text style={[typography.bodyBold, feedTab === 'following' ? styles.tabTextActive : styles.tabTextInactive]}>
                    Following
                  </Text>
                </Pressable>
              </View>
              <View style={styles.filterRow}>
                <DropdownButton label="Cuisine" value={selectedCuisine} onPress={() => setIsCuisineModalOpen(true)} />
                <DropdownButton label="Meal Type" value={selectedMealType} onPress={() => setIsMealTypeModalOpen(true)} />
              </View>
              {ad ? <AdCard ad={ad} /> : null}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              icon="restaurant-outline"
              message={
                feedTab === 'following' && followedAuthorIds.length === 0
                  ? "You're not following anyone yet — follow people from Search to see their recipes here."
                  : publishedRecipes.length === 0
                  ? 'No recipes yet — tap "Post" to share the first one!'
                  : 'No recipes matched — try a different search or filter.'
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

      <SelectModal
        visible={isCuisineModalOpen}
        title="Cuisine"
        options={countries}
        selected={selectedCuisine}
        onSelect={setSelectedCuisine}
        onClose={() => setIsCuisineModalOpen(false)}
        searchable
      />
      <SelectModal
        visible={isMealTypeModalOpen}
        title="Meal Type"
        options={MEAL_TYPES}
        selected={selectedMealType}
        onSelect={(v) => setSelectedMealType(v as MealType | null)}
        onClose={() => setIsMealTypeModalOpen(false)}
      />
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
    cartButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    logoMark: { width: 30, height: 30 },
    brandText: { color: colors.onHeaderBanner },
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
    tabRow: { flexDirection: 'row', marginTop: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: { borderBottomColor: colors.secondary },
    tabTextActive: { color: colors.secondary },
    tabTextInactive: { color: colors.textMuted },
    filterRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
  });
}
