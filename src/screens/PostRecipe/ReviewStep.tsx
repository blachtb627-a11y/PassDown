import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecipeFormState } from './formTypes';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../../theme/typography';

export function ReviewStep({ form }: { form: RecipeFormState }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const totalTime = (Number(form.prepMinutes) || 0) + (Number(form.cookMinutes) || 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={typography.title}>Review your recipe</Text>
      <Text style={[typography.body, styles.helper]}>This is exactly how it will appear.</Text>

      {form.photos.length > 0 ? <Image source={{ uri: form.photos[0] }} style={styles.heroPhoto} /> : null}

      <View style={styles.visibilityRow}>
        <Ionicons name={form.isPrivate ? 'lock-closed-outline' : 'globe-outline'} size={16} color={colors.textMuted} />
        <Text style={typography.meta}>
          {' '}
          {form.isPrivate ? 'Private — only your followers can see this' : 'Public — anyone can see this'}
        </Text>
      </View>

      <Text style={[typography.subtitle, styles.recipeTitle]}>{form.title || 'Untitled Recipe'}</Text>
      {form.story ? <Text style={[typography.body, styles.story]}>{form.story}</Text> : null}

      <View style={styles.statsRow}>
        {totalTime > 0 ? <Text style={typography.meta}>⏱ {totalTime} min total</Text> : null}
        {form.servings ? <Text style={typography.meta}>🍽 Serves {form.servings}</Text> : null}
        {form.difficulty ? <Text style={typography.meta}>{form.difficulty}</Text> : null}
      </View>

      <Text style={[typography.subtitle, styles.sectionTitle]}>Ingredients</Text>
      {form.ingredients
        .filter((i) => i.item.trim())
        .map((i) => (
          <Text key={i.id} style={typography.body}>
            • {[i.quantity, i.unit, i.item].filter(Boolean).join(' ')}
          </Text>
        ))}

      <Text style={[typography.subtitle, styles.sectionTitle]}>Steps</Text>
      {form.steps
        .filter((s) => s.text.trim())
        .map((s, index) => (
          <Text key={s.id} style={[typography.body, styles.step]}>
            {index + 1}. {s.text}
          </Text>
        ))}

      {(form.cuisine || form.mealType || form.diet || form.occasion) ? (
        <View style={styles.tagsRow}>
          {[form.cuisine, form.mealType, form.diet, form.occasion].filter(Boolean).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={typography.meta}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { padding: spacing.md },
    helper: { color: colors.textMuted, marginBottom: spacing.md },
    heroPhoto: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.md, backgroundColor: colors.border },
    visibilityRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
    recipeTitle: { marginTop: spacing.md },
    story: { fontStyle: 'italic', marginTop: spacing.xs },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
    sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.xs },
    step: { marginBottom: spacing.xs },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.lg },
    tag: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  });
}
