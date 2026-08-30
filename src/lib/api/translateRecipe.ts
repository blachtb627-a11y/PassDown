import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Recipe } from '../../types/recipe';

export type TranslatedRecipe = {
  sourceLanguage: string;
  title: string;
  story: string;
  ingredients: { quantity: string; unit: string; item: string }[];
  steps: string[];
};

export async function translateRecipe(recipe: Recipe): Promise<TranslatedRecipe> {
  const { data, error } = await supabase.functions.invoke<{ translation?: TranslatedRecipe; error?: string }>(
    'translate-recipe',
    {
      body: {
        title: recipe.title,
        story: recipe.story ?? '',
        ingredients: recipe.ingredients.map((i) => ({ quantity: i.quantity, unit: i.unit, item: i.item })),
        steps: recipe.steps.map((s) => s.text),
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

  if (!data?.translation) throw new Error(data?.error ?? 'Could not translate this recipe.');
  return data.translation;
}
