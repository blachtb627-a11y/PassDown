import React, { useMemo, useState } from 'react';
import { Image, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Diet, Recipe } from '../types/recipe';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { getCuisineColor } from '../theme/cuisineColors';
import { radius, spacing } from '../theme/typography';
import { getRecipeShareUrl } from '../lib/shareLink';
import { formatRelativeTime } from '../lib/relativeTime';
import { ShareToCircleModal } from './ShareToCircleModal';

type Props = {
  recipe: Recipe;
  onPress: () => void;
  onPressComments: () => void;
  onToggleSave: () => void;
  onToggleLike: () => void;
  isSaved: boolean;
  isLiked: boolean;
};

// A colored badge for the one diet the poster picked — a compact stand-in
// for the multi-tag dietary badges in the reference design until recipes
// support more than one diet tag at a time.
const DIET_BADGE: Record<Exclude<Diet, 'None'>, { color: string }> = {
  Vegetarian: { color: '#5C7A4A' },
  Vegan: { color: '#3F7D5A' },
  'Gluten-Free': { color: '#C4922B' },
  'Dairy-Free': { color: '#B5451F' },
};

export function RecipeCard({ recipe, onPress, onPressComments, onToggleSave, onToggleLike, isSaved, isLiked }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cuisineColor = getCuisineColor(recipe.cuisine);
  const hasPhoto = recipe.photos.length > 0;
  const dietBadge = recipe.diet && recipe.diet !== 'None' ? DIET_BADGE[recipe.diet] : null;
  const tags = [recipe.occasion, recipe.difficulty, recipe.mealType].filter(Boolean) as string[];
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button" accessibilityLabel={recipe.title}>
      <View style={styles.authorRow}>
        <Pressable
          style={styles.authorInfo}
          hitSlop={4}
          accessibilityLabel={`${recipe.author.name}'s profile`}
        >
          <Image
            source={{ uri: recipe.author.avatarUri ?? 'https://picsum.photos/seed/recipe-author/100' }}
            style={styles.authorAvatar}
          />
          <Text style={typography.meta} numberOfLines={1}>
            <Text style={typography.bodyBold}>{recipe.author.name}</Text> passed this down
          </Text>
        </Pressable>
        <Text style={[typography.meta, styles.postedAt]} numberOfLines={1}>
          {formatRelativeTime(recipe.createdAt)}
        </Text>
      </View>

      <View style={styles.photoWrapper}>
        {hasPhoto ? (
          <Image source={{ uri: recipe.photos[0] }} style={styles.photo} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.photo, styles.placeholderPhoto, { backgroundColor: cuisineColor }]}>
            <Ionicons name="restaurant" size={36} color="rgba(255,255,255,0.85)" />
          </View>
        )}
        {recipe.cuisine ? (
          <View style={[styles.cuisineBadge, { backgroundColor: cuisineColor }]}>
            <Text style={[typography.meta, styles.cuisineBadgeText]} numberOfLines={1}>
              {recipe.cuisine}
            </Text>
          </View>
        ) : null}
        {recipe.isPrivate ? (
          <View style={styles.privateBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.white} />
          </View>
        ) : null}
        <View style={styles.titleScrim}>
          <Text style={[typography.photoTitle, styles.titleText]} numberOfLines={2}>
            {recipe.title}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {dietBadge || tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {dietBadge ? (
              <View style={[styles.dietBadge, { backgroundColor: dietBadge.color }]}>
                <Text style={styles.dietBadgeText} numberOfLines={1}>
                  {recipe.diet}
                </Text>
              </View>
            ) : null}
            {tags.map((tag) => (
              <View key={tag} style={styles.pill}>
                <Text style={[typography.meta, styles.pillText]} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <View style={styles.actionsGroup}>
            <Pressable
              onPress={onToggleLike}
              style={styles.actionButton}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Unlike recipe' : 'Like recipe'}
            >
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? colors.primary : colors.textMuted} />
              <Text style={typography.meta}> {recipe.likeCount}</Text>
            </Pressable>
            <Pressable
              onPress={onPressComments}
              style={styles.actionButton}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="View and add comments"
            >
              <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
              <Text style={typography.meta}> {recipe.commentCount}</Text>
            </Pressable>
          </View>
          <View style={styles.actionsGroup}>
            <Pressable
              onPress={() => {
                const url = getRecipeShareUrl(recipe.id);
                Share.share(
                  Platform.OS === 'ios'
                    ? { message: `Check out "${recipe.title}" on PassDown!`, url }
                    : { message: `Check out "${recipe.title}" on PassDown!\n${url}` }
                );
              }}
              style={styles.actionButton}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Share recipe"
            >
              <Ionicons name="share-outline" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => setIsCircleModalOpen(true)}
              style={styles.actionButton}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Share to a Circle"
            >
              <Ionicons name="people-outline" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={onToggleSave}
              style={styles.actionButton}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Remove from Recipe Box' : 'Save to Recipe Box'}
            >
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={isSaved ? colors.secondary : colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>

      <ShareToCircleModal recipeId={recipe.id} visible={isCircleModalOpen} onClose={() => setIsCircleModalOpen(false)} />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      minHeight: 32,
    },
    authorInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border },
    postedAt: { flexShrink: 0, marginLeft: spacing.xs },
    photoWrapper: { position: 'relative' },
    photo: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: colors.border,
    },
    placeholderPhoto: { alignItems: 'center', justifyContent: 'center' },
    cuisineBadge: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      maxWidth: '80%',
    },
    cuisineBadgeText: { color: colors.white, fontWeight: '600' },
    privateBadge: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: radius.pill,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(20,15,10,0.5)',
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    titleText: {
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    body: {
      padding: spacing.sm,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    dietBadge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dietBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    pill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    pillText: { fontWeight: '600' },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    actionsGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 32,
    },
  });
}
