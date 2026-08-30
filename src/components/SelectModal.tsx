import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';

type Props = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  searchable?: boolean;
  allLabel?: string;
};

export function SelectModal({ visible, title, options, selected, onSelect, onClose, searchable, allLabel = 'All' }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filtered = query.trim() ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase())) : options;

  const handleSelect = (value: string | null) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={[typography.subtitle, styles.title]}>{title}</Text>
          {searchable ? (
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${title.toLowerCase()}...`}
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
            </View>
          ) : null}
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            <Pressable
              style={styles.row}
              onPress={() => handleSelect(null)}
              accessibilityRole="radio"
              accessibilityState={{ checked: !selected }}
            >
              <Ionicons
                name={!selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={!selected ? colors.secondary : colors.textMuted}
              />
              <Text style={[typography.bodyBold, styles.rowText]}>{allLabel}</Text>
            </Pressable>
            {filtered.map((opt) => (
              <Pressable
                key={opt}
                style={styles.row}
                onPress={() => handleSelect(opt)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected === opt }}
              >
                <Ionicons
                  name={selected === opt ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected === opt ? colors.secondary : colors.textMuted}
                />
                <Text style={[typography.body, styles.rowText]}>{opt}</Text>
              </Pressable>
            ))}
            {filtered.length === 0 ? <Text style={[typography.body, styles.emptyText]}>No matches.</Text> : null}
          </ScrollView>
          <View style={{ height: spacing.sm }} />
          <PrimaryButton label="Close" variant="outline" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    title: { marginBottom: spacing.md },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    searchInput: { flex: 1, ...typography.body, paddingVertical: spacing.sm },
    list: { maxHeight: 340 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
    rowText: { flex: 1 },
    emptyText: { color: colors.textMuted, paddingVertical: spacing.md, textAlign: 'center' },
  });
}
