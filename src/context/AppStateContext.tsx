import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Author, Collection, Recipe, ShoppingListItem } from '../types/recipe';
import {
  addComment as apiAddComment,
  addMadeThisPost as apiAddMadeThisPost,
  fetchFeedRecipes,
  fetchLikedRecipeIds,
  fetchRecipesByAuthor,
  fetchSavedRecipeIds,
  toggleLike as apiToggleLike,
  toggleSave as apiToggleSave,
  upsertRecipe,
} from '../lib/api/recipes';
import {
  fetchFollowedAuthorIds,
  fetchProfileWithCounts,
  toggleFollow as apiToggleFollow,
  updateProfile as apiUpdateProfile,
  ProfileUpdateInput,
} from '../lib/api/social';
import { createCollection as apiCreateCollection, fetchCollections } from '../lib/api/collections';
import {
  addRecipeIngredientsToShoppingList as apiAddRecipeIngredientsToShoppingList,
  clearCheckedShoppingListItems as apiClearCheckedShoppingListItems,
  fetchShoppingList,
  toggleShoppingListItem as apiToggleShoppingListItem,
} from '../lib/api/shoppingList';
import { uploadPhoto } from '../lib/api/photos';

const GUEST_USER: Author = {
  id: 'guest',
  name: 'Guest',
  username: '',
  bio: '',
  followerCount: 0,
  followingCount: 0,
};

function dedupeRecipesById(recipes: Recipe[]): Recipe[] {
  const seen = new Set<string>();
  const result: Recipe[] = [];
  for (const recipe of recipes) {
    if (seen.has(recipe.id)) continue;
    seen.add(recipe.id);
    result.push(recipe);
  }
  return result;
}

export type RecipeFormInput = {
  id?: string;
  title: string;
  story?: string;
  photos: string[];
  ingredients: Recipe['ingredients'];
  steps: Recipe['steps'];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  cuisine?: string;
  mealType?: Recipe['mealType'];
  diet?: Recipe['diet'];
  difficulty?: Recipe['difficulty'];
  occasion?: Recipe['occasion'];
  isDraft: boolean;
};

type AppStateContextValue = {
  recipes: Recipe[];
  savedRecipeIds: string[];
  likedRecipeIds: string[];
  collections: Collection[];
  shoppingList: ShoppingListItem[];
  followedAuthorIds: string[];
  isLoaded: boolean;
  currentUser: Author;
  saveRecipe: (input: RecipeFormInput) => Promise<Recipe>;
  toggleSaveRecipe: (recipeId: string) => void;
  toggleLikeRecipe: (recipeId: string) => void;
  toggleFollowAuthor: (authorId: string) => void;
  createCollection: (name: string) => Promise<void>;
  addRecipeIngredientsToShoppingList: (recipe: Recipe) => Promise<void>;
  toggleShoppingListItem: (itemId: string) => void;
  clearCheckedShoppingListItems: () => void;
  addMadeThisPost: (recipeId: string, localPhotoUri: string, note?: string) => Promise<void>;
  addComment: (recipeId: string, text: string) => void;
  updateProfile: (input: ProfileUpdateInput & { localAvatarUri?: string }) => Promise<void>;
  refetch: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [likedRecipeIds, setLikedRecipeIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [followedAuthorIds, setFollowedAuthorIds] = useState<string[]>([]);
  const [ownProfile, setOwnProfile] = useState<Author | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentUser: Author = useMemo(() => {
    if (!session?.user) return GUEST_USER;
    if (ownProfile) return ownProfile;
    const metadata = session.user.user_metadata as { full_name?: string; username?: string } | undefined;
    return {
      id: session.user.id,
      name: metadata?.full_name?.trim() || session.user.email?.split('@')[0] || 'You',
      username: metadata?.username ?? '',
      bio: '',
      followerCount: 0,
      followingCount: 0,
    };
  }, [session, ownProfile]);

  const refetch = useCallback(async () => {
    if (!userId) {
      setRecipes([]);
      setSavedRecipeIds([]);
      setLikedRecipeIds([]);
      setCollections([]);
      setShoppingList([]);
      setFollowedAuthorIds([]);
      setOwnProfile(null);
      setIsLoaded(true);
      return;
    }
    try {
      const [feed, myRecipes, saved, liked, cols, list, followed, profile] = await Promise.all([
        fetchFeedRecipes(),
        fetchRecipesByAuthor(userId),
        fetchSavedRecipeIds(userId),
        fetchLikedRecipeIds(userId),
        fetchCollections(userId),
        fetchShoppingList(userId),
        fetchFollowedAuthorIds(userId),
        fetchProfileWithCounts(userId),
      ]);
      setRecipes(dedupeRecipesById([...feed, ...myRecipes]));
      setSavedRecipeIds(saved);
      setLikedRecipeIds(liked);
      setCollections(cols);
      setShoppingList(list);
      setFollowedAuthorIds(followed);
      if (profile) setOwnProfile(profile);
    } catch (error) {
      console.error('Failed to load PassDown data', error);
    } finally {
      setIsLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    setIsLoaded(false);
    refetch();
  }, [refetch]);

  const value = useMemo<AppStateContextValue>(() => {
    const saveRecipe = async (input: RecipeFormInput): Promise<Recipe> => {
      const uploadIfLocal = (uri: string) => (uri.startsWith('http') ? Promise.resolve(uri) : uploadPhoto(uri, currentUser.id));

      const uploadedPhotos = await Promise.all(input.photos.map(uploadIfLocal));
      const uploadedSteps = await Promise.all(
        input.steps.map(async (step) => ({
          ...step,
          photoUri: step.photoUri ? await uploadIfLocal(step.photoUri) : undefined,
        }))
      );
      const recipe = await upsertRecipe(currentUser.id, { ...input, photos: uploadedPhotos, steps: uploadedSteps });
      setRecipes((prev) => {
        const withoutThis = prev.filter((r) => r.id !== recipe.id);
        return [recipe, ...withoutThis];
      });
      return recipe;
    };

    const toggleSaveRecipe = (recipeId: string) => {
      const wasSaved = savedRecipeIds.includes(recipeId);
      setSavedRecipeIds((prev) => (wasSaved ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]));
      apiToggleSave(recipeId, currentUser.id, wasSaved).catch((error) => {
        console.error('Failed to save/unsave recipe', error);
        setSavedRecipeIds((prev) => (wasSaved ? [...prev, recipeId] : prev.filter((id) => id !== recipeId)));
      });
    };

    const toggleLikeRecipe = (recipeId: string) => {
      const wasLiked = likedRecipeIds.includes(recipeId);
      setLikedRecipeIds((prev) => (wasLiked ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]));
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, likeCount: r.likeCount + (wasLiked ? -1 : 1) } : r))
      );
      apiToggleLike(recipeId, currentUser.id, wasLiked).catch((error) => {
        console.error('Failed to like/unlike recipe', error);
        setLikedRecipeIds((prev) => (wasLiked ? [...prev, recipeId] : prev.filter((id) => id !== recipeId)));
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, likeCount: r.likeCount + (wasLiked ? 1 : -1) } : r))
        );
      });
    };

    const toggleFollowAuthor = (authorId: string) => {
      const wasFollowing = followedAuthorIds.includes(authorId);
      setFollowedAuthorIds((prev) => (wasFollowing ? prev.filter((id) => id !== authorId) : [...prev, authorId]));
      apiToggleFollow(currentUser.id, authorId, wasFollowing).catch((error) => {
        console.error('Failed to follow/unfollow', error);
        setFollowedAuthorIds((prev) =>
          wasFollowing ? [...prev, authorId] : prev.filter((id) => id !== authorId)
        );
      });
    };

    const createCollection = async (name: string) => {
      try {
        const collection = await apiCreateCollection(currentUser.id, name);
        setCollections((prev) => [...prev, collection]);
      } catch (error) {
        console.error('Failed to create collection', error);
      }
    };

    const addRecipeIngredientsToShoppingList = async (recipe: Recipe) => {
      await apiAddRecipeIngredientsToShoppingList(currentUser.id, recipe);
      setShoppingList(await fetchShoppingList(currentUser.id));
    };

    const toggleShoppingListItem = (itemId: string) => {
      const item = shoppingList.find((i) => i.id === itemId);
      if (!item) return;
      setShoppingList((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
      apiToggleShoppingListItem(itemId, item.checked).catch((error) => {
        console.error('Failed to update shopping list item', error);
        setShoppingList((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked: item.checked } : i)));
      });
    };

    const clearCheckedShoppingListItems = () => {
      setShoppingList((prev) => prev.filter((item) => !item.checked));
      apiClearCheckedShoppingListItems(currentUser.id).catch((error) => {
        console.error('Failed to clear checked shopping list items', error);
      });
    };

    const addMadeThisPost = async (recipeId: string, localPhotoUri: string, note?: string) => {
      const photoUrl = await uploadPhoto(localPhotoUri, currentUser.id);
      await apiAddMadeThisPost(recipeId, currentUser.id, photoUrl, note);
      await refetch();
    };

    const addComment = (recipeId: string, text: string) => {
      const optimisticId = `local-${Date.now()}`;
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId
            ? {
                ...r,
                commentCount: r.commentCount + 1,
                comments: [
                  ...r.comments,
                  { id: optimisticId, authorName: currentUser.name, text, createdAt: new Date().toISOString() },
                ],
              }
            : r
        )
      );
      apiAddComment(recipeId, currentUser.id, text).catch((error) => {
        console.error('Failed to add comment', error);
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipeId
              ? {
                  ...r,
                  commentCount: Math.max(r.commentCount - 1, 0),
                  comments: r.comments.filter((c) => c.id !== optimisticId),
                }
              : r
          )
        );
      });
    };

    const updateProfile = async (input: ProfileUpdateInput & { localAvatarUri?: string }) => {
      const avatarUrl = input.localAvatarUri ? await uploadPhoto(input.localAvatarUri, currentUser.id) : input.avatarUrl;
      await apiUpdateProfile(currentUser.id, {
        fullName: input.fullName,
        username: input.username,
        bio: input.bio,
        avatarUrl,
      });
      setOwnProfile((prev) => ({
        ...(prev ?? currentUser),
        name: input.fullName,
        username: input.username,
        bio: input.bio,
        avatarUri: avatarUrl ?? prev?.avatarUri,
      }));
    };

    return {
      recipes,
      savedRecipeIds,
      likedRecipeIds,
      collections,
      shoppingList,
      followedAuthorIds,
      isLoaded,
      currentUser,
      saveRecipe,
      toggleSaveRecipe,
      toggleLikeRecipe,
      toggleFollowAuthor,
      createCollection,
      addRecipeIngredientsToShoppingList,
      toggleShoppingListItem,
      clearCheckedShoppingListItems,
      addMadeThisPost,
      addComment,
      updateProfile,
      refetch,
    };
  }, [
    recipes,
    savedRecipeIds,
    likedRecipeIds,
    collections,
    shoppingList,
    followedAuthorIds,
    isLoaded,
    currentUser,
    refetch,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
