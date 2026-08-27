import { Diet, Difficulty, Ingredient, MealType, Occasion, Step } from '../../types/recipe';

export type RecipeFormState = {
  photos: string[];
  title: string;
  story: string;
  ingredients: Ingredient[];
  steps: Step[];
  prepMinutes: string;
  cookMinutes: string;
  servings: string;
  cuisine: string;
  mealType: MealType | null;
  diet: Diet | null;
  difficulty: Difficulty | null;
  occasion: Occasion | null;
};

let idCounter = 0;
export function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function emptyIngredient(): Ingredient {
  return { id: nextId('ing'), quantity: '', unit: '', item: '' };
}

export function emptyStep(): Step {
  return { id: nextId('step'), text: '' };
}

export function emptyFormState(): RecipeFormState {
  return {
    photos: [],
    title: '',
    story: '',
    ingredients: [emptyIngredient()],
    steps: [emptyStep()],
    prepMinutes: '',
    cookMinutes: '',
    servings: '',
    cuisine: '',
    mealType: null,
    diet: null,
    difficulty: null,
    occasion: null,
  };
}

export const STEP_TITLES = ['Photos', 'Title & Story', 'Ingredients', 'Steps', 'Details', 'Review'];
