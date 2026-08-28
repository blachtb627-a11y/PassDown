import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

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
  const totalTime = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button" accessibilityLabel={recipe.title}>
      <Image source={{ uri: recipe.photos[0] }} style={styles.photo} accessibilityIgnoresInvertColors />
      {recipe.isPrivate ? (
        <View style={styles.privateBadge}>
          <Ionicons name="lock-closed" size={12} color={colors.white} />
          <Text style={[typography.meta, styles.privateBadgeText]}> Private</Text>
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.authorRow}>
          <Image source={{ uri: recipe.author.avatarUri }} style={styles.avatar} />
          <Text style={typography.meta}>{recipe.author.name}</Text>
        </View>
        <Text style={[typography.subtitle, styles.title]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.statsRow}>
          {totalTime > 0 ? (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={typography.meta}> {totalTime} min</Text>
            </View>
          ) : null}
          {recipe.servings ? (
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={typography.meta}> Serves {recipe.servings}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onToggleLike}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Unlike recipe' : 'Like recipe'}
          >
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? colors.primary : colors.text} />
            <Text style={typography.meta}> {recipe.likeCount}</Text>
          </Pressable>
          <Pressable
            onPress={onPressComments}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel="View and add comments"
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
            <Text style={typography.meta}> {recipe.commentCount}</Text>
          </Pressable>
          <Pressable
            onPress={onToggleSave}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from Recipe Box' : 'Save to Recipe Box'}
          >
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={isSaved ? colors.secondary : colors.text} />
            <Text style={typography.meta}> {isSaved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: colors.border,
  },
  privateBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  privateBadgeText: { color: colors.white },
  body: {
    padding: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: spacing.sm,
    backgroundColor: colors.border,
  },
  title: {
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
    minHeight: 44,
  },
});
