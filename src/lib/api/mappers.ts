import { Author, Collection, Comment, Ingredient, MadeThisPost, Recipe, ShoppingListItem, Step } from '../../types/recipe';
import { Tables } from '../database.types';

type ProfileRow = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'bio'>;
type RecipeRow = Tables<'recipes'>;
type CommentRow = Pick<Tables<'comments'>, 'id' | 'text' | 'created_at'> & { author: ProfileRow | null };
type MadeThisRow = Pick<Tables<'made_this_posts'>, 'id' | 'photo_url' | 'note' | 'created_at'> & {
  author: ProfileRow | null;
};

export type RecipeRowWithRelations = RecipeRow & {
  author: ProfileRow | null;
  comments: CommentRow[] | null;
  made_this_posts: MadeThisRow[] | null;
};

export function mapAuthor(row: ProfileRow | null, fallbackId: string): Author {
  return {
    id: row?.id ?? fallbackId,
    name: row?.full_name || 'Unknown Cook',
    avatarUri: row?.avatar_url ?? undefined,
    bio: row?.bio ?? '',
    followerCount: 0,
    followingCount: 0,
  };
}

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    authorName: row.author?.full_name ?? 'Unknown Cook',
    text: row.text,
    createdAt: row.created_at,
  };
}

function mapMadeThisPost(row: MadeThisRow): MadeThisPost {
  return {
    id: row.id,
    authorName: row.author?.full_name ?? 'Unknown Cook',
    photoUri: row.photo_url,
    note: row.note ?? undefined,
  };
}

export function mapRecipe(row: RecipeRowWithRelations): Recipe {
  return {
    id: row.id,
    title: row.title,
    story: row.story ?? undefined,
    photos: (row.photos as string[] | null) ?? [],
    author: mapAuthor(row.author, row.author_id),
    ingredients: (row.ingredients as Ingredient[] | null) ?? [],
    steps: (row.steps as Step[] | null) ?? [],
    prepMinutes: row.prep_minutes ?? undefined,
    cookMinutes: row.cook_minutes ?? undefined,
    servings: row.servings ?? undefined,
    cuisine: row.cuisine ?? undefined,
    mealType: (row.meal_type as Recipe['mealType']) ?? undefined,
    diet: (row.diet as Recipe['diet']) ?? undefined,
    difficulty: (row.difficulty as Recipe['difficulty']) ?? undefined,
    occasion: (row.occasion as Recipe['occasion']) ?? undefined,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    comments: (row.comments ?? []).map(mapComment),
    madeThisPosts: (row.made_this_posts ?? []).map(mapMadeThisPost),
    isDraft: row.is_draft,
    createdAt: row.created_at,
  };
}

export function mapCollection(
  row: Tables<'collections'>,
  recipeIds: string[]
): Collection {
  return { id: row.id, name: row.name, recipeIds };
}

export function mapShoppingListItem(row: Tables<'shopping_list_items'>): ShoppingListItem {
  return {
    id: row.id,
    item: row.item,
    quantity: row.quantity,
    unit: row.unit,
    checked: row.checked,
    fromRecipeIds: (row.from_recipe_ids as string[] | null) ?? [],
  };
}
