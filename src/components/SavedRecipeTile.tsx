import React, { ReactNode, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Recipe } from '../types/recipe';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, serifFamily, spacing } from '../theme/typography';

type Props = {
  recipe: Recipe;
  onPress: () => void;
  style?: ViewStyle;
  overlay?: ReactNode;
};

// A photo card with its title centered in a dark green footer, in the same
// warm serif used for photo-overlaid titles elsewhere — used anywhere a
// saved/shared recipe shows up as a small tile (Circle's Shared Recipes row,
// Profile's Saved grid) so those look consistent with each other.
export function SavedRecipeTile({ recipe, onPress, style, overlay }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={[styles.tile, style]} onPress={onPress} accessibilityRole="button" accessibilityLabel={recipe.title}>
      <View style={styles.photoWrapper}>
        <Image source={{ uri: recipe.photos[0] }} style={styles.photo} />
        {overlay}
      </View>
      <View style={styles.caption}>
        <Text style={styles.captionText} numberOfLines={2}>
          {recipe.title}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    tile: {
      borderRadius: radius.md,
      backgroundColor: colors.secondary,
      overflow: 'hidden',
    },
    photoWrapper: { position: 'relative' },
    photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
    caption: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    captionText: {
      fontFamily: serifFamily,
      fontWeight: '700',
      fontSize: 14,
      color: colors.white,
      textAlign: 'center',
    },
  });
}
