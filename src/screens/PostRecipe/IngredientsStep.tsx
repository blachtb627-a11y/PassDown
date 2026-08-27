import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient } from '../../types/recipe';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/typography';
import { emptyIngredient } from './formTypes';

type Props = {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
};

export function IngredientsStep({ ingredients, onChange }: Props) {
  const updateIngredient = (id: string, patch: Partial<Ingredient>) => {
    onChange(ingredients.map((ing) => (ing.id === id ? { ...ing, ...patch } : ing)));
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length === 1) return;
    onChange(ingredients.filter((ing) => ing.id !== id));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={typography.title}>Ingredients</Text>
      <Text style={[typography.body, styles.helper]}>Add each ingredient as quantity, unit, and item.</Text>

      {ingredients.map((ing, index) => (
        <View key={ing.id} style={styles.row}>
          <TextInput
            style={[styles.input, styles.quantityInput]}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            value={ing.quantity}
            onChangeText={(v) => updateIngredient(ing.id, { quantity: v })}
            accessibilityLabel={`Ingredient ${index + 1} quantity`}
          />
          <TextInput
            style={[styles.input, styles.unitInput]}
            placeholder="cup"
            placeholderTextColor={colors.textMuted}
            value={ing.unit}
            onChangeText={(v) => updateIngredient(ing.id, { unit: v })}
            accessibilityLabel={`Ingredient ${index + 1} unit`}
          />
          <TextInput
            style={[styles.input, styles.itemInput]}
            placeholder="flour"
            placeholderTextColor={colors.textMuted}
            value={ing.item}
            onChangeText={(v) => updateIngredient(ing.id, { item: v })}
            accessibilityLabel={`Ingredient ${index + 1} name`}
          />
          <Pressable
            onPress={() => removeIngredient(ing.id)}
            disabled={ingredients.length === 1}
            style={styles.removeButton}
            accessibilityRole="button"
            accessibilityLabel={`Remove ingredient ${index + 1}`}
          >
            <Ionicons name="trash-outline" size={22} color={ingredients.length === 1 ? colors.border : colors.danger} />
          </Pressable>
        </View>
      ))}

      <View style={styles.addButtonWrapper}>
        <PrimaryButton
          label="Add Ingredient"
          icon="add-circle-outline"
          variant="outline"
          onPress={() => onChange([...ingredients, emptyIngredient()])}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  helper: { color: colors.textMuted, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  quantityInput: { flex: 1 },
  unitInput: { flex: 1 },
  itemInput: { flex: 2.5 },
  removeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  addButtonWrapper: { marginTop: spacing.md },
});
