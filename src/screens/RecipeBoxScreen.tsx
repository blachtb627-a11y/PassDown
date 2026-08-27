import React, { useState } from 'react';
import { Alert, FlatList, Image, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { EmptyState } from '../components/EmptyState';
import { FilterChip } from '../components/FilterChip';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

const ALL_SAVED = 'all-saved';

export function RecipeBoxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { recipes, savedRecipeIds, collections, createCollection } = useAppState();
  const [activeCollectionId, setActiveCollectionId] = useState<string>(ALL_SAVED);

  const savedRecipes = recipes.filter((r) => savedRecipeIds.includes(r.id));
  const visibleRecipes =
    activeCollectionId === ALL_SAVED
      ? savedRecipes
      : savedRecipes.filter((r) => collections.find((c) => c.id === activeCollectionId)?.recipeIds.includes(r.id));

  const handleNewCollection = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('New Collection', 'Name your new collection (e.g., "Christmas", "Quick Dinners")', (name) => {
        if (name && name.trim()) createCollection(name.trim());
      });
      return;
    }
    const untitledCount = collections.filter((c) => c.name.startsWith('Untitled Collection')).length;
    createCollection(untitledCount === 0 ? 'Untitled Collection' : `Untitled Collection ${untitledCount + 1}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.display}>Recipe Box</Text>
        <Pressable
          onPress={() => navigation.navigate('ShoppingList')}
          style={styles.shoppingListButton}
          accessibilityRole="button"
          accessibilityLabel="Open Shopping List"
        >
          <Ionicons name="cart-outline" size={22} color={colors.secondary} />
          <Text style={[typography.bodyBold, { color: colors.secondary }]}> Shopping List</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.collectionsRow}
        data={[{ id: ALL_SAVED, name: 'All Saved' }, ...collections]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FilterChip
            label={item.name}
            selected={activeCollectionId === item.id}
            onPress={() => setActiveCollectionId(item.id)}
          />
        )}
        ListFooterComponent={
          <Pressable onPress={handleNewCollection} style={styles.newCollectionChip} accessibilityRole="button" accessibilityLabel="New Collection">
            <Ionicons name="add" size={18} color={colors.secondary} />
            <Text style={[typography.bodyBold, { color: colors.secondary }]}> New</Text>
          </Pressable>
        }
      />

      {visibleRecipes.length === 0 ? (
        <EmptyState icon="bookmark-outline" message='No recipes saved yet — tap the "Save" button on any recipe to start your collection.' />
      ) : (
        <FlatList
          data={visibleRecipes}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.md }}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.gridItem}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <Image source={{ uri: item.photos[0] }} style={styles.gridPhoto} />
              <Text style={typography.bodyBold} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  shoppingListButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  collectionsRow: { flexGrow: 0, paddingHorizontal: spacing.md, marginVertical: spacing.md },
  newCollectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
  },
  gridItem: { flex: 1, gap: spacing.xs },
  gridPhoto: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
});
