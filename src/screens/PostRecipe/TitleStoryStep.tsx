import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing, typography } from '../../theme/typography';

type Props = {
  title: string;
  story: string;
  onChangeTitle: (v: string) => void;
  onChangeStory: (v: string) => void;
};

export function TitleStoryStep({ title, story, onChangeTitle, onChangeStory }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={typography.title}>What's it called?</Text>

      <Text style={[typography.bodyBold, styles.label]}>Recipe Title (required)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Sunday Pot Roast"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={onChangeTitle}
      />

      <Text style={[typography.bodyBold, styles.label]}>Why this recipe matters to you (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="This is the recipe my mother made every Sunday..."
        placeholderTextColor={colors.textMuted}
        value={story}
        onChangeText={onChangeStory}
        multiline
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  label: { marginTop: spacing.lg, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
