import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Step } from '../../types/recipe';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../../theme/typography';
import { emptyStep } from './formTypes';
import { notify } from '../../lib/alert';

type Props = {
  steps: Step[];
  onChange: (steps: Step[]) => void;
};

export function StepsStep({ steps, onChange }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const updateStep = (id: string, patch: Partial<Step>) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeStep = (id: string) => {
    if (steps.length === 1) return;
    onChange(steps.filter((s) => s.id !== id));
  };

  const addStepPhoto = async (id: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Photo access needed', 'Allow photo library access in Settings to add a step photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      updateStep(id, { photoUri: result.assets[0].uri });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={typography.title}>Steps</Text>
      <Text style={[typography.body, styles.helper]}>One step per box — add a photo if it helps.</Text>

      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <Text style={typography.bodyBold}>Step {index + 1}</Text>
            <Pressable
              onPress={() => removeStep(step.id)}
              disabled={steps.length === 1}
              accessibilityRole="button"
              accessibilityLabel={`Remove step ${index + 1}`}
            >
              <Ionicons name="trash-outline" size={22} color={steps.length === 1 ? colors.border : colors.danger} />
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Describe this step..."
            placeholderTextColor={colors.textMuted}
            value={step.text}
            onChangeText={(v) => updateStep(step.id, { text: v })}
            multiline
            accessibilityLabel={`Step ${index + 1} instructions`}
          />
          {step.photoUri ? (
            <Image source={{ uri: step.photoUri }} style={styles.stepPhoto} />
          ) : (
            <Pressable
              style={styles.addPhotoRow}
              onPress={() => addStepPhoto(step.id)}
              accessibilityRole="button"
              accessibilityLabel={`Add photo to step ${index + 1}`}
            >
              <Ionicons name="camera-outline" size={20} color={colors.secondary} />
              <Text style={[typography.bodyBold, { color: colors.secondary }]}> Add Photo (optional)</Text>
            </Pressable>
          )}
        </View>
      ))}

      <View style={styles.addButtonWrapper}>
        <PrimaryButton label="Add Step" icon="add-circle-outline" variant="outline" onPress={() => onChange([...steps, emptyStep()])} />
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { padding: spacing.md },
    helper: { color: colors.textMuted, marginBottom: spacing.lg },
    stepCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
    },
    stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    input: {
      ...typography.body,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    stepPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm, marginTop: spacing.sm },
    addPhotoRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: spacing.xs },
    addButtonWrapper: { marginTop: spacing.sm },
  });
}
