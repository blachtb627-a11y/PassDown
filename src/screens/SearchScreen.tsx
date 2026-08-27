import React, { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { categories } from '../data/categories';
import { RecipeCard } from '../components/RecipeCard';
import { FilterChip } from '../components/FilterChip';
import { CategoryTile } from '../components/CategoryTile';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';
import { MealType } from '../types/recipe';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drink'];

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { recipes, savedRecipeIds, likedRecipeIds, toggleSaveRecipe, toggleLikeRecipe } = useAppState();
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
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
