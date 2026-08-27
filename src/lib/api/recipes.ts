import { supabase } from '../supabase';
import { Recipe } from '../../types/recipe';
import { mapRecipe, RecipeRowWithRelations } from './mappers';

const RECIPE_SELECT = `
  *,
  author:profiles!recipes_author_id_fkey(id, full_name, username, avatar_url, bio),
  comments(id, text, created_at, author:profiles!comments_author_id_fkey(id, full_name, username, avatar_url, bio)),
  made_this_posts(id, photo_url, note, created_at, author:profiles!made_this_posts_author_id_fkey(id, full_name, username, avatar_url, bio))
`;

export async function fetchFeedRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('is_draft', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as RecipeRowWithRelations[]).map(mapRecipe);
}

export async function fetchRecipesByAuthor(authorId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as RecipeRowWithRelations[]).map(mapRecipe);
}

export async function fetchMyDraftRecipes(authorId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('author_id', authorId)
    .eq('is_draft', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as RecipeRowWithRelations[]).map(mapRecipe);
}

type RecipeInput = {
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

export async function upsertRecipe(authorId: string, input: RecipeInput): Promise<Recipe> {
  const row = {
    id: input.id,
    author_id: authorId,
    title: input.title,
    story: input.story ?? null,
    photos: input.photos,
    ingredients: input.ingredients,
    steps: input.steps,
    prep_minutes: input.prepMinutes ?? null,
    cook_minutes: input.cookMinutes ?? null,
    servings: input.servings ?? null,
    cuisine: input.cuisine ?? null,
    meal_type: input.mealType ?? null,
    diet: input.diet ?? null,
    difficulty: input.difficulty ?? null,
    occasion: input.occasion ?? null,
    is_draft: input.isDraft,
  };
  const { data, error } = await supabase.from('recipes').upsert(row).select(RECIPE_SELECT).single();
  if (error) throw error;
  return mapRecipe(data as unknown as RecipeRowWithRelations);
}

export async function toggleLike(recipeId: string, userId: string, isCurrentlyLiked: boolean): Promise<void> {
  if (isCurrentlyLiked) {
    const { error } = await supabase.from('likes').delete().eq('recipe_id', recipeId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('likes').insert({ recipe_id: recipeId, user_id: userId });
    if (error) throw error;
  }
}

export async function fetchLikedRecipeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('likes').select('recipe_id').eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => row.recipe_id);
}

export async function toggleSave(recipeId: string, userId: string, isCurrentlySaved: boolean): Promise<void> {
  if (isCurrentlySaved) {
    const { error } = await supabase.from('saves').delete().eq('recipe_id', recipeId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('saves').insert({ recipe_id: recipeId, user_id: userId });
    if (error) throw error;
  }
}

export async function fetchSavedRecipeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('saves').select('recipe_id').eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => row.recipe_id);
}

export async function addComment(recipeId: string, authorId: string, text: string): Promise<void> {
  const { error } = await supabase.from('comments').insert({ recipe_id: recipeId, author_id: authorId, text });
  if (error) throw error;
}

export async function addMadeThisPost(
  recipeId: string,
  authorId: string,
  photoUrl: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from('made_this_posts')
    .insert({ recipe_id: recipeId, author_id: authorId, photo_url: photoUrl, note: note ?? null });
  if (error) throw error;
}
