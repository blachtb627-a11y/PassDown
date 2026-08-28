import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { categories } from '../data/categories';
import { fetchSuggestedUsers, searchUsers } from '../lib/api/social';
import { RecipeCard } from '../components/RecipeCard';
import { FilterChip } from '../components/FilterChip';
import { CategoryTile } from '../components/CategoryTile';
import { UserResultCard } from '../components/UserResultCard';
import { EmptyState } from '../components/EmptyState';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';
import { Author, MealType } from '../types/recipe';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drink'];
type SearchMode = 'recipes' | 'people';

function PeopleSearch() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, followedAuthorIds, toggleFollowAuthor } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Author[]>([]);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const load = isSearching
      ? searchUsers(query, currentUser.id)
      : fetchSuggestedUsers([currentUser.id, ...followedAuthorIds]);
    const timeout = setTimeout(() => {
      load
        .then((users) => {
          if (!cancelled) setResults(users);
        })
        .catch((error) => console.error('Failed to load people', error))
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, isSearching ? 400 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentUser.id]);

  return (
    <>
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people by name or username..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.peopleList}
        ListHeaderComponent={
          !isSearching ? <Text style={[typography.subtitle, styles.peopleHeader]}>Suggested for you</Text> : null
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            <EmptyState
              icon="people-outline"
              message={isSearching ? 'No one found with that name or username.' : 'No suggestions right now.'}
            />
          )
        }
        renderItem={({ item }) => (
          <UserResultCard
            user={item}
            isFollowing={followedAuthorIds.includes(item.id)}
            onToggleFollow={() => toggleFollowAuthor(item.id)}
            onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
          />
        )}
      />
    </>
  );
}

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { recipes, savedRecipeIds, likedRecipeIds, toggleSaveRecipe, toggleLikeRecipe } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [mode, setMode] = useState<SearchMode>('recipes');
  const [query, setQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (r.isDraft) return false;
      if (selectedMealType && r.mealType !== selectedMealType) return false;
      if (!q) return true;
      const haystack = [r.title, r.cuisine ?? '', ...r.ingredients.map((i) => i.item), ...(r.mealType ? [r.mealType] : [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [recipes, query, selectedMealType]);

  const showBrowse = !query.trim() && !selectedMealType;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modeRow}>
        <FilterChip label="Recipes" selected={mode === 'recipes'} onPress={() => setMode('recipes')} />
        <FilterChip label="People" selected={mode === 'people'} onPress={() => setMode('people')} />
      </View>

      {mode === 'people' ? (
        <PeopleSearch />
      ) : (
        <>
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

          <FlatList
            data={showBrowse ? [] : results}
            keyExtractor={(item) => item.id}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            ListHeaderComponent={
              <View>
                <View style={styles.chipsRow}>
                  {MEAL_TYPES.map((type) => (
                    <FilterChip
                      key={type}
                      label={type}
                      selected={selectedMealType === type}
                      onPress={() => setSelectedMealType((prev) => (prev === type ? null : type))}
                    />
                  ))}
                </View>
                {showBrowse ? (
                  <View style={styles.section}>
                    <Text style={typography.subtitle}>Browse by Category</Text>
                    <View style={styles.categoryGrid}>
                      {categories.map((cat) => (
                        <CategoryTile
                          key={cat.id}
                          label={cat.label}
                          photoUri={cat.photoUri}
                          onPress={() => setQuery(cat.label)}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              showBrowse ? null : <EmptyState icon="search-outline" message="No recipes matched — try a different search or filter." />
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
        </>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  modeRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.xs },
  peopleList: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  peopleHeader: { marginBottom: spacing.sm },
  loading: { marginTop: spacing.xl },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, paddingVertical: spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  });
}
