import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient } from '../../types/recipe';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../../theme/typography';
import { emptyIngredient } from './formTypes';

type Props = {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
};

export function IngredientsStep({ ingredients, onChange }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
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
      <Text style={[typography.body, styles.helper]}>
        Add each ingredient as quantity, unit, and name. The ingredient name is required.
      </Text>

      {ingredients.map((ing, index) => (
        <View key={ing.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={typography.bodyBold}>Ingredient {index + 1}</Text>
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
          <View style={styles.row}>
            <View style={styles.quantityInput}>
              <Text style={[typography.meta, styles.fieldLabel]}>Qty</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                value={ing.quantity}
                onChangeText={(v) => updateIngredient(ing.id, { quantity: v })}
                accessibilityLabel={`Ingredient ${index + 1} quantity`}
              />
            </View>
            <View style={styles.unitInput}>
              <Text style={[typography.meta, styles.fieldLabel]}>Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="cup"
                placeholderTextColor={colors.textMuted}
                value={ing.unit}
                onChangeText={(v) => updateIngredient(ing.id, { unit: v })}
                accessibilityLabel={`Ingredient ${index + 1} unit`}
              />
            </View>
          </View>
          <Text style={[typography.meta, styles.fieldLabel]}>Ingredient (required)</Text>
          <TextInput
            style={styles.input}
            placeholder="flour"
            placeholderTextColor={colors.textMuted}
            value={ing.item}
            onChangeText={(v) => updateIngredient(ing.id, { item: v })}
            accessibilityLabel={`Ingredient ${index + 1} name`}
          />
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

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { padding: spacing.md },
    helper: { color: colors.textMuted, marginBottom: spacing.lg },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    fieldLabel: { color: colors.textMuted, marginBottom: spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      minHeight: 48,
      backgroundColor: colors.background,
      ...typography.body,
    },
    quantityInput: { flex: 1 },
    unitInput: { flex: 1 },
    removeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    addButtonWrapper: { marginTop: spacing.md },
  });
}
