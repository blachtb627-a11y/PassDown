import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Author, Collection, Recipe, ShoppingListItem } from '../types/recipe';
import {
  addComment as apiAddComment,
  addMadeThisPost as apiAddMadeThisPost,
  deleteRecipe as apiDeleteRecipe,
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
import {
  addRecipeToCollection as apiAddRecipeToCollection,
  createCollection as apiCreateCollection,
  deleteCollection as apiDeleteCollection,
  fetchCollections,
  removeRecipeFromCollection as apiRemoveRecipeFromCollection,
  renameCollection as apiRenameCollection,
} from '../lib/api/collections';
import {
  addRecipeIngredientsToShoppingList as apiAddRecipeIngredientsToShoppingList,
  clearAllShoppingListItems as apiClearAllShoppingListItems,
  clearCheckedShoppingListItems as apiClearCheckedShoppingListItems,
  fetchShoppingList,
  toggleShoppingListItem as apiToggleShoppingListItem,
} from '../lib/api/shoppingList';
import { uploadPhoto } from '../lib/api/photos';
import { fetchUnreadNotificationCount, subscribeToNotifications } from '../lib/api/notifications';

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
  isPrivate: boolean;
};

type AppStateContextValue = {
  recipes: Recipe[];
  savedRecipeIds: string[];
  likedRecipeIds: string[];
  collections: Collection[];
  shoppingList: ShoppingListItem[];
  followedAuthorIds: string[];
  followBusyIds: Set<string>;
  isLoaded: boolean;
  currentUser: Author;
  saveRecipe: (input: RecipeFormInput) => Promise<Recipe>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  toggleSaveRecipe: (recipeId: string) => void;
  toggleLikeRecipe: (recipeId: string) => void;
  toggleFollowAuthor: (authorId: string) => void;
  createCollection: (name: string) => Promise<void>;
  renameCollection: (collectionId: string, name: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  addRecipeToCollection: (collectionId: string, recipeId: string) => Promise<void>;
  removeRecipeFromCollection: (collectionId: string, recipeId: string) => Promise<void>;
  addRecipeIngredientsToShoppingList: (recipe: Recipe) => Promise<void>;
  toggleShoppingListItem: (itemId: string) => void;
  clearCheckedShoppingListItems: () => void;
  clearAllShoppingListItems: () => void;
  addMadeThisPost: (recipeId: string, localPhotoUri: string, note?: string) => Promise<void>;
  addComment: (recipeId: string, text: string) => void;
  updateProfile: (input: ProfileUpdateInput & { localAvatarUri?: string }) => Promise<void>;
  unreadNotificationCount: number;
  refreshUnreadNotificationCount: () => Promise<void>;
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
  const [followBusyIds, setFollowBusyIds] = useState<Set<string>>(new Set());
  const [ownProfile, setOwnProfile] = useState<Author | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

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
      setUnreadNotificationCount(0);
      setIsLoaded(true);
      return;
    }
    try {
      const [feed, myRecipes, saved, liked, cols, list, followed, profile, unreadCount] = await Promise.all([
        fetchFeedRecipes(),
        fetchRecipesByAuthor(userId),
        fetchSavedRecipeIds(userId),
        fetchLikedRecipeIds(userId),
        fetchCollections(userId),
        fetchShoppingList(userId),
        fetchFollowedAuthorIds(userId),
        fetchProfileWithCounts(userId),
        fetchUnreadNotificationCount(userId),
      ]);
      setRecipes(dedupeRecipesById([...feed, ...myRecipes]));
      setSavedRecipeIds(saved);
      setLikedRecipeIds(liked);
      setCollections(cols);
      setShoppingList(list);
      setFollowedAuthorIds(followed);
      if (profile) setOwnProfile(profile);
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error('Failed to load PassDown data', error);
    } finally {
      setIsLoaded(true);
    }
  }, [userId]);

  const refreshUnreadNotificationCount = useCallback(async () => {
    if (!userId) return;
    try {
      setUnreadNotificationCount(await fetchUnreadNotificationCount(userId));
    } catch (error) {
      console.error('Failed to refresh unread notification count', error);
    }
  }, [userId]);

  // Live badge updates: bump the count the instant a trigger inserts a new
  // notification, rather than waiting for the next full refetch.
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, () => {
      setUnreadNotificationCount((prev) => prev + 1);
    });
    return unsubscribe;
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

    const deleteRecipe = async (recipeId: string): Promise<void> => {
      await apiDeleteRecipe(recipeId);
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
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

    // Guarded against re-entrancy per authorId: without this, two taps before
    // the first request resolves both read the same stale wasFollowing value,
    // apply the same optimistic change twice, and fire two API calls in the
    // same direction — desyncing local state from what's actually in Supabase.
    const toggleFollowAuthor = (authorId: string) => {
      if (followBusyIds.has(authorId)) return;
      const wasFollowing = followedAuthorIds.includes(authorId);
      setFollowBusyIds((prev) => new Set(prev).add(authorId));
      setFollowedAuthorIds((prev) => (wasFollowing ? prev.filter((id) => id !== authorId) : [...prev, authorId]));
      apiToggleFollow(currentUser.id, authorId, wasFollowing)
        .catch((error) => {
          console.error('Failed to follow/unfollow', error);
          setFollowedAuthorIds((prev) =>
            wasFollowing ? [...prev, authorId] : prev.filter((id) => id !== authorId)
          );
        })
        .finally(() => {
          setFollowBusyIds((prev) => {
            const next = new Set(prev);
            next.delete(authorId);
            return next;
          });
        });
    };

    const createCollection = async (name: string) => {
      const collection = await apiCreateCollection(currentUser.id, name);
      setCollections((prev) => [...prev, collection]);
    };

    const renameCollection = async (collectionId: string, name: string) => {
      await apiRenameCollection(collectionId, name);
      setCollections((prev) => prev.map((c) => (c.id === collectionId ? { ...c, name } : c)));
    };

    const deleteCollection = async (collectionId: string) => {
      await apiDeleteCollection(collectionId);
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    };

    const addRecipeToCollection = async (collectionId: string, recipeId: string) => {
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId && !c.recipeIds.includes(recipeId) ? { ...c, recipeIds: [...c.recipeIds, recipeId] } : c))
      );
      try {
        await apiAddRecipeToCollection(collectionId, recipeId);
      } catch (error) {
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? { ...c, recipeIds: c.recipeIds.filter((id) => id !== recipeId) } : c))
        );
        throw error;
      }
    };

    const removeRecipeFromCollection = async (collectionId: string, recipeId: string) => {
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? { ...c, recipeIds: c.recipeIds.filter((id) => id !== recipeId) } : c))
      );
      try {
        await apiRemoveRecipeFromCollection(collectionId, recipeId);
      } catch (error) {
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId && !c.recipeIds.includes(recipeId) ? { ...c, recipeIds: [...c.recipeIds, recipeId] } : c))
        );
        throw error;
      }
    };

    const addRecipeIngredientsToShoppingList = async (recipe: Recipe) => {
      const updatedItems = await apiAddRecipeIngredientsToShoppingList(currentUser.id, recipe, shoppingList);
      setShoppingList((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item]));
        for (const item of updatedItems) byId.set(item.id, item);
        return Array.from(byId.values());
      });
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
      const previous = shoppingList;
      setShoppingList((prev) => prev.filter((item) => !item.checked));
      apiClearCheckedShoppingListItems(currentUser.id).catch((error) => {
        console.error('Failed to clear checked shopping list items', error);
        setShoppingList(previous);
      });
    };

    const clearAllShoppingListItems = () => {
      const previous = shoppingList;
      setShoppingList([]);
      apiClearAllShoppingListItems(currentUser.id).catch((error) => {
        console.error('Failed to clear shopping list', error);
        setShoppingList(previous);
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
      followBusyIds,
      isLoaded,
      currentUser,
      saveRecipe,
      deleteRecipe,
      toggleSaveRecipe,
      toggleLikeRecipe,
      toggleFollowAuthor,
      createCollection,
      renameCollection,
      deleteCollection,
      addRecipeToCollection,
      removeRecipeFromCollection,
      addRecipeIngredientsToShoppingList,
      toggleShoppingListItem,
      clearCheckedShoppingListItems,
      clearAllShoppingListItems,
      addMadeThisPost,
      addComment,
      updateProfile,
      unreadNotificationCount,
      refreshUnreadNotificationCount,
      refetch,
    };
  }, [
    recipes,
    savedRecipeIds,
    likedRecipeIds,
    collections,
    shoppingList,
    followedAuthorIds,
    followBusyIds,
    isLoaded,
    currentUser,
    unreadNotificationCount,
    refreshUnreadNotificationCount,
    refetch,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
