import React, { useMemo } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../context/AppStateContext';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/typography';

export function ShoppingListScreen() {
  const { shoppingList, toggleShoppingListItem, clearCheckedShoppingListItems } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const checkedCount = shoppingList.filter((i) => i.checked).length;

  return (
    <SafeAreaView style={styles.container}>
      {shoppingList.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          message='Your shopping list is empty — tap "Add to Shopping List" on any recipe to fill it in.'
        />
      ) : (
        <FlatList
          data={shoppingList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => toggleShoppingListItem(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
              accessibilityLabel={`${item.quantity} ${item.unit} ${item.item}`}
            >
              <Ionicons
                name={item.checked ? 'checkbox' : 'square-outline'}
                size={26}
                color={item.checked ? colors.secondary : colors.textMuted}
              />
              <Text style={[typography.body, styles.itemText, item.checked && styles.itemChecked]}>
                {[item.quantity, item.unit, item.item].filter(Boolean).join(' ')}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            checkedCount > 0 ? (
              <View style={styles.footer}>
                <PrimaryButton label={`Clear ${checkedCount} Checked Items`} variant="outline" onPress={clearCheckedShoppingListItems} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 48,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemText: { flex: 1 },
    itemChecked: { textDecorationLine: 'line-through', color: colors.textMuted },
    footer: { paddingTop: spacing.lg },
  });
}
