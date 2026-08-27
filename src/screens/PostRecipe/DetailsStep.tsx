import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Diet, Difficulty, MealType, Occasion } from '../../types/recipe';
import { FilterChip } from '../../components/FilterChip';
import { colors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/typography';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Drink'];
const DIETS: Diet[] = ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Advanced'];
const OCCASIONS: Occasion[] = ['Weeknight', 'Holiday', 'Potluck', 'Special Occasion'];

type Props = {
  prepMinutes: string;
  cookMinutes: string;
  servings: string;
  cuisine: string;
  mealType: MealType | null;
  diet: Diet | null;
  difficulty: Difficulty | null;
  occasion: Occasion | null;
  onChange: (patch: Partial<{
    prepMinutes: string;
    cookMinutes: string;
    servings: string;
    cuisine: string;
    mealType: MealType | null;
    diet: Diet | null;
    difficulty: Difficulty | null;
    occasion: Occasion | null;
  }>) => void;
};

export function DetailsStep({ prepMinutes, cookMinutes, servings, cuisine, mealType, diet, difficulty, occasion, onChange }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={typography.title}>A few details</Text>
      <Text style={[typography.body, styles.helper]}>All optional — skip anything you're not sure about.</Text>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={typography.bodyBold}>Prep (min)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={prepMinutes}
            onChangeText={(v) => onChange({ prepMinutes: v })}
          />
        </View>
        <View style={styles.timeField}>
          <Text style={typography.bodyBold}>Cook (min)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={cookMinutes}
            onChangeText={(v) => onChange({ cookMinutes: v })}
          />
        </View>
        <View style={styles.timeField}>
          <Text style={typography.bodyBold}>Servings</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={servings}
            onChangeText={(v) => onChange({ servings: v })}
          />
        </View>
      </View>

      <Text style={[typography.bodyBold, styles.label]}>Cuisine</Text>
      <TextInput
        style={[styles.input, styles.fullInput]}
        placeholder="e.g., Italian, Mexican, American"
        placeholderTextColor={colors.textMuted}
        value={cuisine}
        onChangeText={(v) => onChange({ cuisine: v })}
      />

      <Text style={[typography.bodyBold, styles.label]}>Meal Type</Text>
      <View style={styles.chipsRow}>
        {MEAL_TYPES.map((t) => (
          <FilterChip key={t} label={t} selected={mealType === t} onPress={() => onChange({ mealType: mealType === t ? null : t })} />
        ))}
      </View>

      <Text style={[typography.bodyBold, styles.label]}>Diet</Text>
      <View style={styles.chipsRow}>
        {DIETS.map((d) => (
          <FilterChip key={d} label={d} selected={diet === d} onPress={() => onChange({ diet: diet === d ? null : d })} />
        ))}
      </View>

      <Text style={[typography.bodyBold, styles.label]}>Difficulty</Text>
      <View style={styles.chipsRow}>
        {DIFFICULTIES.map((d) => (
          <FilterChip key={d} label={d} selected={difficulty === d} onPress={() => onChange({ difficulty: difficulty === d ? null : d })} />
        ))}
      </View>

      <Text style={[typography.bodyBold, styles.label]}>Occasion</Text>
      <View style={styles.chipsRow}>
        {OCCASIONS.map((o) => (
          <FilterChip key={o} label={o} selected={occasion === o} onPress={() => onChange({ occasion: occasion === o ? null : o })} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  helper: { color: colors.textMuted, marginBottom: spacing.lg },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  timeField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    ...typography.body,
  },
  fullInput: { marginBottom: spacing.md },
  label: { marginTop: spacing.lg, marginBottom: spacing.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
