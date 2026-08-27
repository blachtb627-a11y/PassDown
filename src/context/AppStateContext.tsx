import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockRecipes } from '../data/mockRecipes';
import { Author, Collection, Recipe, ShoppingListItem } from '../types/recipe';

const STORAGE_KEY = 'passdown:app-state:v1';

export const currentUser: Author = {
  id: 'me',
  name: 'You',
  bio: 'Home cook sharing what I make.',
  followerCount: 3,
  followingCount: 2,
};

type PersistedState = {
  recipes: Recipe[];
  savedRecipeIds: string[];
  likedRecipeIds: string[];
  collections: Collection[];
  shoppingList: ShoppingListItem[];
  followedAuthorIds: string[];
};

const defaultCollections: Collection[] = [
  { id: 'col-quick-dinners', name: 'Quick Dinners', recipeIds: [] },
  { id: 'col-holiday', name: 'Holiday', recipeIds: [] },
];

const defaultState: PersistedState = {
  recipes: mockRecipes,
  savedRecipeIds: [],
  likedRecipeIds: [],
  collections: defaultCollections,
  shoppingList: [],
  followedAuthorIds: [],
};

type AppStateContextValue = PersistedState & {
  isLoaded: boolean;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (recipe: Recipe) => void;
  toggleSaveRecipe: (recipeId: string) => void;
  toggleLikeRecipe: (recipeId: string) => void;
  toggleFollowAuthor: (authorId: string) => void;
  createCollection: (name: string) => Collection;
  addRecipeToCollection: (recipeId: string, collectionId: string) => void;
  removeRecipeFromCollection: (recipeId: string, collectionId: string) => void;
  addRecipeIngredientsToShoppingList: (recipe: Recipe) => void;
  toggleShoppingListItem: (itemId: string) => void;
  clearCheckedShoppingListItems: () => void;
  addMadeThisPost: (recipeId: string, photoUri: string, note?: string) => void;
  addComment: (recipeId: string, text: string) => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function normalizeItemKey(item: string, unit: string) {
  return `${item.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState({ ...defaultState, ...JSON.parse(raw) });
        }
      } catch {
        // fall back to default state if storage is unavailable or corrupt
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, isLoaded]);

  const value = useMemo<AppStateContextValue>(() => {
    const addRecipe = (recipe: Recipe) => {
      setState((prev) => ({ ...prev, recipes: [recipe, ...prev.recipes] }));
    };

    const updateRecipe = (recipe: Recipe) => {
      setState((prev) => ({
        ...prev,
        recipes: prev.recipes.map((r) => (r.id === recipe.id ? recipe : r)),
      }));
    };

    const toggleSaveRecipe = (recipeId: string) => {
      setState((prev) => {
        const isSaved = prev.savedRecipeIds.includes(recipeId);
        return {
          ...prev,
          savedRecipeIds: isSaved
            ? prev.savedRecipeIds.filter((id) => id !== recipeId)
            : [...prev.savedRecipeIds, recipeId],
        };
      });
    };

    const toggleLikeRecipe = (recipeId: string) => {
      setState((prev) => {
        const isLiked = prev.likedRecipeIds.includes(recipeId);
        return {
          ...prev,
          likedRecipeIds: isLiked
            ? prev.likedRecipeIds.filter((id) => id !== recipeId)
            : [...prev.likedRecipeIds, recipeId],
          recipes: prev.recipes.map((r) =>
            r.id === recipeId ? { ...r, likeCount: r.likeCount + (isLiked ? -1 : 1) } : r
          ),
        };
      });
    };

    const toggleFollowAuthor = (authorId: string) => {
      setState((prev) => {
        const isFollowing = prev.followedAuthorIds.includes(authorId);
        return {
          ...prev,
          followedAuthorIds: isFollowing
            ? prev.followedAuthorIds.filter((id) => id !== authorId)
            : [...prev.followedAuthorIds, authorId],
        };
      });
    };

    const createCollection = (name: string): Collection => {
      const collection: Collection = { id: `col-${Date.now()}`, name, recipeIds: [] };
      setState((prev) => ({ ...prev, collections: [...prev.collections, collection] }));
      return collection;
    };

    const addRecipeToCollection = (recipeId: string, collectionId: string) => {
      setState((prev) => ({
        ...prev,
        savedRecipeIds: prev.savedRecipeIds.includes(recipeId)
          ? prev.savedRecipeIds
          : [...prev.savedRecipeIds, recipeId],
        collections: prev.collections.map((c) =>
          c.id === collectionId && !c.recipeIds.includes(recipeId)
            ? { ...c, recipeIds: [...c.recipeIds, recipeId] }
            : c
        ),
      }));
    };

    const removeRecipeFromCollection = (recipeId: string, collectionId: string) => {
      setState((prev) => ({
        ...prev,
        collections: prev.collections.map((c) =>
          c.id === collectionId ? { ...c, recipeIds: c.recipeIds.filter((id) => id !== recipeId) } : c
        ),
      }));
    };

    const addRecipeIngredientsToShoppingList = (recipe: Recipe) => {
      setState((prev) => {
        const list = [...prev.shoppingList];
        for (const ingredient of recipe.ingredients) {
          const key = normalizeItemKey(ingredient.item, ingredient.unit);
          const existing = list.find(
            (li) => normalizeItemKey(li.item, li.unit) === key && !li.fromRecipeIds.includes(recipe.id)
          );
          if (existing) {
            existing.fromRecipeIds = [...existing.fromRecipeIds, recipe.id];
          } else {
            list.push({
              id: `sl-${ingredient.id}-${recipe.id}-${Date.now()}`,
              item: ingredient.item,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              checked: false,
              fromRecipeIds: [recipe.id],
            });
          }
        }
        return { ...prev, shoppingList: list };
      });
    };

    const toggleShoppingListItem = (itemId: string) => {
      setState((prev) => ({
        ...prev,
        shoppingList: prev.shoppingList.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        ),
      }));
    };

    const clearCheckedShoppingListItems = () => {
      setState((prev) => ({ ...prev, shoppingList: prev.shoppingList.filter((item) => !item.checked) }));
    };

    const addMadeThisPost = (recipeId: string, photoUri: string, note?: string) => {
      setState((prev) => ({
        ...prev,
        recipes: prev.recipes.map((r) =>
          r.id === recipeId
            ? {
                ...r,
                madeThisPosts: [
                  { id: `mt-${Date.now()}`, authorName: currentUser.name, photoUri, note },
                  ...r.madeThisPosts,
                ],
              }
            : r
        ),
      }));
    };

    const addComment = (recipeId: string, text: string) => {
      setState((prev) => ({
        ...prev,
        recipes: prev.recipes.map((r) =>
          r.id === recipeId
            ? {
                ...r,
                commentCount: r.commentCount + 1,
                comments: [
                  ...r.comments,
                  { id: `c-${Date.now()}`, authorName: currentUser.name, text, createdAt: new Date().toISOString() },
                ],
              }
            : r
        ),
      }));
    };

    return {
      ...state,
      isLoaded,
      addRecipe,
      updateRecipe,
      toggleSaveRecipe,
      toggleLikeRecipe,
      toggleFollowAuthor,
      createCollection,
      addRecipeToCollection,
      removeRecipeFromCollection,
      addRecipeIngredientsToShoppingList,
      toggleShoppingListItem,
      clearCheckedShoppingListItems,
      addMadeThisPost,
      addComment,
    };
  }, [state, isLoaded]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
