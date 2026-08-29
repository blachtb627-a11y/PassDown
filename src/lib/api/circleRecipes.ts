import { supabase } from '../supabase';
import { Recipe } from '../../types/recipe';
import { mapRecipe, RecipeRowWithRelations } from './mappers';
import { RECIPE_SELECT } from './recipes';

export async function fetchCircleRecipes(circleId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('circle_recipes')
    .select(`added_at, recipe:recipes(${RECIPE_SELECT})`)
    .eq('circle_id', circleId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as { recipe: RecipeRowWithRelations | null }[])
    .filter((row): row is { recipe: RecipeRowWithRelations } => !!row.recipe)
    .map((row) => mapRecipe(row.recipe));
}

export async function fetchCirclesSharingRecipe(recipeId: string): Promise<string[]> {
  const { data, error } = await supabase.from('circle_recipes').select('circle_id').eq('recipe_id', recipeId);
  if (error) throw error;
  return data.map((row) => row.circle_id);
}

export async function shareRecipeToCircle(circleId: string, recipeId: string): Promise<void> {
  const { error } = await supabase.from('circle_recipes').insert({ circle_id: circleId, recipe_id: recipeId });
  if (error) throw error;
}

export async function removeRecipeFromCircle(circleId: string, recipeId: string): Promise<void> {
  const { error } = await supabase.from('circle_recipes').delete().eq('circle_id', circleId).eq('recipe_id', recipeId);
  if (error) throw error;
}
