import { supabase } from '../supabase';
import { Recipe, ShoppingListItem } from '../../types/recipe';
import { mapShoppingListItem } from './mappers';

function normalizeItemKey(item: string, unit: string) {
  return `${item.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
}

export async function fetchShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(mapShoppingListItem);
}

export async function addRecipeIngredientsToShoppingList(userId: string, recipe: Recipe): Promise<void> {
  const existing = await fetchShoppingList(userId);

  for (const ingredient of recipe.ingredients) {
    const key = normalizeItemKey(ingredient.item, ingredient.unit);
    const existingItem = existing.find(
      (item) => normalizeItemKey(item.item, item.unit) === key && !item.fromRecipeIds.includes(recipe.id)
    );

    if (existingItem) {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ from_recipe_ids: [...existingItem.fromRecipeIds, recipe.id] })
        .eq('id', existingItem.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('shopping_list_items').insert({
        user_id: userId,
        item: ingredient.item,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        from_recipe_ids: [recipe.id],
      });
      if (error) throw error;
    }
  }
}

export async function toggleShoppingListItem(itemId: string, checked: boolean): Promise<void> {
  const { error } = await supabase.from('shopping_list_items').update({ checked: !checked }).eq('id', itemId);
  if (error) throw error;
}

export async function clearCheckedShoppingListItems(userId: string): Promise<void> {
  const { error } = await supabase.from('shopping_list_items').delete().eq('user_id', userId).eq('checked', true);
  if (error) throw error;
}
