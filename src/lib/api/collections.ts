import { supabase } from '../supabase';
import { Collection } from '../../types/recipe';
import { mapCollection } from './mappers';

export async function fetchCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*, collection_recipes(recipe_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((row) =>
    mapCollection(
      row,
      (row.collection_recipes as { recipe_id: string }[]).map((r) => r.recipe_id)
    )
  );
}

export async function createCollection(userId: string, name: string): Promise<Collection> {
  const { data, error } = await supabase.from('collections').insert({ user_id: userId, name }).select().single();
  if (error) throw error;
  return mapCollection(data, []);
}

export async function addRecipeToCollection(collectionId: string, recipeId: string): Promise<void> {
  const { error } = await supabase
    .from('collection_recipes')
    .insert({ collection_id: collectionId, recipe_id: recipeId });
  if (error) throw error;
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<void> {
  const { error } = await supabase
    .from('collection_recipes')
    .delete()
    .eq('collection_id', collectionId)
    .eq('recipe_id', recipeId);
  if (error) throw error;
}
