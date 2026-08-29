import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircleSummary, fetchMyCircles } from '../lib/api/circles';
import { fetchCirclesSharingRecipe, removeRecipeFromCircle, shareRecipeToCircle } from '../lib/api/circleRecipes';
import { getErrorMessage, notify } from '../lib/alert';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  recipeId: string;
  visible: boolean;
  onClose: () => void;
};

export function ShareToCircleModal({ recipeId, visible, onClose }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [isLoading, setIsLoading] = useState(false);
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [sharedCircleIds, setSharedCircleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setIsLoading(true);
    Promise.all([fetchMyCircles(), fetchCirclesSharingRecipe(recipeId)])
      .then(([myCircles, sharedIds]) => {
        setCircles(myCircles);
        setSharedCircleIds(new Set(sharedIds));
      })
      .catch((error) => notify('Something went wrong', getErrorMessage(error, 'Could not load your circles.')))
      .finally(() => setIsLoading(false));
  }, [visible, recipeId]);

  const handleToggle = async (circleId: string) => {
    const isShared = sharedCircleIds.has(circleId);
    setSharedCircleIds((prev) => {
      const next = new Set(prev);
      if (isShared) next.delete(circleId);
      else next.add(circleId);
      return next;
    });
    try {
      if (isShared) {
        await removeRecipeFromCircle(circleId, recipeId);
      } else {
        await shareRecipeToCircle(circleId, recipeId);
      }
    } catch (error) {
      setSharedCircleIds((prev) => {
        const next = new Set(prev);
        if (isShared) next.add(circleId);
        else next.delete(circleId);
        return next;
      });
      notify('Something went wrong', getErrorMessage(error, 'Could not update this circle.'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={[typography.subtitle, styles.modalTitle]}>Share to a Circle</Text>
          {isLoading ? (
            <Text style={typography.body}>Loading...</Text>
          ) : circles.length === 0 ? (
            <Text style={[typography.body, styles.modalHint]}>
              You're not in any circles yet — create one from the Circles tab first.
            </Text>
          ) : (
            circles.map((circle) => {
              const isShared = sharedCircleIds.has(circle.id);
              return (
                <Pressable
                  key={circle.id}
                  style={styles.optionRow}
                  onPress={() => handleToggle(circle.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isShared }}
                >
                  <Ionicons name={isShared ? 'checkbox' : 'square-outline'} size={22} color={isShared ? colors.secondary : colors.textMuted} />
                  <Text style={typography.body}> {circle.name}</Text>
                </Pressable>
              );
            })
          )}
          <View style={{ height: spacing.md }} />
          <PrimaryButton label="Done" variant="outline" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    modalTitle: { marginBottom: spacing.md },
    modalHint: { color: colors.textMuted, marginBottom: spacing.sm },
    optionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  });
}
