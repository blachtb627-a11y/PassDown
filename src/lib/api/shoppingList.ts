import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Recipe, ShoppingListItem } from '../../types/recipe';
import { mapShoppingListItem } from './mappers';

function normalizeItemKey(item: string, unit: string) {
  return `${item.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
}

function parseQuantity(quantity: string): number | null {
  const trimmed = quantity.trim();
  if (!trimmed) return null;
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function formatQuantity(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

// Used only as a fallback if the AI merge call fails — still sums numeric
// quantities (unlike the old exact-match logic, which silently kept whichever
// quantity was added first and dropped the rest) rather than being smart
// about differently-worded ingredients.
function sumQuantities(a: string, b: string): string {
  const na = parseQuantity(a);
  const nb = parseQuantity(b);
  if (na === null || nb === null) {
    return [a, b].map((s) => s.trim()).filter(Boolean).join(' + ');
  }
  return formatQuantity(na + nb);
}

type MergeDecision = {
  newIngredientIndex: number;
  existingItemId?: string;
  quantity: string;
  unit: string;
  item: string;
};

// Asks Claude to decide, for each new ingredient, whether it's the same
// grocery item as something already on the list (even worded differently —
// "bell pepper" vs "red pepper, diced") and what the combined quantity
// should be. Runs server-side since it needs the Anthropic API key.
async function requestMergePlan(
  existingItems: ShoppingListItem[],
  newIngredients: { item: string; quantity: string; unit: string }[]
): Promise<MergeDecision[]> {
  const { data, error } = await supabase.functions.invoke<{ merges?: MergeDecision[]; error?: string }>(
    'merge-shopping-list',
    {
      body: {
        existingItems: existingItems.map((i) => ({ id: i.id, item: i.item, quantity: i.quantity, unit: i.unit })),
        newIngredients,
      },
    }
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let message = error.message;
      try {
        const responseBody = await error.context.json();
        if (responseBody?.error) message = responseBody.error;
      } catch {
        // response body wasn't JSON — fall back to the generic message above
      }
      throw new Error(message);
    }
    throw error;
  }

  if (!data?.merges) throw new Error(data?.error ?? 'Could not combine shopping list items.');
  return data.merges;
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
  // Ignores items already linked to this same recipe, so re-adding it (e.g.
  // after editing) merges into other recipes' entries, not a leftover from an
  // earlier add of this exact recipe.
  const mergeableExisting = existing.filter((item) => !item.fromRecipeIds.includes(recipe.id));
  const newIngredients = recipe.ingredients.map((i) => ({ item: i.item, quantity: i.quantity, unit: i.unit }));

  let decisions: MergeDecision[] | null = null;
  try {
    decisions = await requestMergePlan(mergeableExisting, newIngredients);
  } catch (error) {
    console.error('AI shopping list merge failed, falling back to exact-match combining', error);
  }

  if (decisions) {
    for (let index = 0; index < recipe.ingredients.length; index++) {
      const ingredient = recipe.ingredients[index];
      const decision = decisions.find((d) => d.newIngredientIndex === index);
      const existingItem = decision?.existingItemId ? existing.find((i) => i.id === decision.existingItemId) : undefined;

      if (decision && existingItem) {
        const { error } = await supabase
          .from('shopping_list_items')
          .update({
            item: decision.item,
            quantity: decision.quantity,
            unit: decision.unit,
            from_recipe_ids: [...existingItem.fromRecipeIds, recipe.id],
          })
          .eq('id', existingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shopping_list_items').insert({
          user_id: userId,
          item: decision?.item ?? ingredient.item,
          quantity: decision?.quantity ?? ingredient.quantity,
          unit: decision?.unit ?? ingredient.unit,
          from_recipe_ids: [recipe.id],
        });
        if (error) throw error;
      }
    }
    return;
  }

  for (const ingredient of recipe.ingredients) {
    const key = normalizeItemKey(ingredient.item, ingredient.unit);
    const existingItem = mergeableExisting.find((item) => normalizeItemKey(item.item, item.unit) === key);

    if (existingItem) {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({
          quantity: sumQuantities(existingItem.quantity, ingredient.quantity),
          from_recipe_ids: [...existingItem.fromRecipeIds, recipe.id],
        })
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
