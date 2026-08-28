import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { getCuisineColor } from '../theme/cuisineColors';
import { radius, spacing } from '../theme/typography';

type Props = {
  recipe: Recipe;
  onPress: () => void;
  onPressComments: () => void;
  onToggleSave: () => void;
  onToggleLike: () => void;
  isSaved: boolean;
  isLiked: boolean;
};

export function RecipeCard({ recipe, onPress, onPressComments, onToggleSave, onToggleLike, isSaved, isLiked }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cuisineColor = getCuisineColor(recipe.cuisine);
  const hasPhoto = recipe.photos.length > 0;

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button" accessibilityLabel={recipe.title}>
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
      </View>
      <View style={styles.body}>
        <Text style={[typography.bodyBold, styles.title]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={typography.meta} numberOfLines={1}>
          from {recipe.author.name}
        </Text>
        <View style={styles.actionsRow}>
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
    photoWrapper: { position: 'relative' },
    photo: {
      width: '100%',
      aspectRatio: 1,
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
    body: {
      padding: spacing.sm,
    },
    title: {
      marginBottom: 2,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 32,
    },
  });
}
