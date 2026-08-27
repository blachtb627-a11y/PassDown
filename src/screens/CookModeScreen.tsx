import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/typography';

const { width } = Dimensions.get('window');

function StepTimer({ minutes }: { minutes: number }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <Pressable
      style={styles.timerPill}
      onPress={() => setRunning((r) => !r)}
      accessibilityRole="button"
      accessibilityLabel={running ? 'Pause timer' : 'Start timer'}
    >
      <Ionicons name={running ? 'pause' : 'timer-outline'} size={22} color={colors.white} />
      <Text style={styles.timerText}>
        {mm}:{ss}
      </Text>
    </Pressable>
  );
}

export function CookModeScreen() {
  useKeepAwake();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CookMode'>>();
  const { recipes } = useAppState();
  const recipe = recipes.find((r) => r.id === route.params.recipeId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  if (!recipe) {
    return <EmptyState icon="alert-circle-outline" message="This recipe couldn't be found." />;
  }

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, recipe.steps.length - 1));
    setCurrentIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Exit Cook Mode"
        >
          <Ionicons name="close" size={28} color={colors.text} />
          <Text style={typography.bodyBold}> Exit Cook Mode</Text>
        </Pressable>
      </View>

      <Text style={styles.recipeTitle} numberOfLines={1}>
        {recipe.title}
      </Text>

      <FlatList
        ref={listRef}
        data={recipe.steps}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item, index }) => (
          <View style={styles.stepPage}>
            <Text style={styles.stepLabel}>
              Step {index + 1} of {recipe.steps.length}
            </Text>
            <Text style={styles.stepText}>{item.text}</Text>
            {item.timerMinutes ? <StepTimer minutes={item.timerMinutes} /> : null}
          </View>
        )}
      />

      <View style={styles.progressDots}>
        {recipe.steps.map((step, index) => (
          <View key={step.id} style={[styles.dot, index === currentIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.navRow}>
        <Pressable
          onPress={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
        >
          <Ionicons name="chevron-back" size={28} color={colors.white} />
          <Text style={styles.navButtonText}>Back</Text>
        </Pressable>
        <Pressable
          onPress={() => goTo(currentIndex + 1)}
          disabled={currentIndex === recipe.steps.length - 1}
          style={[styles.navButton, currentIndex === recipe.steps.length - 1 && styles.navButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Next step"
        >
          <Text style={styles.navButtonText}>Next</Text>
          <Ionicons name="chevron-forward" size={28} color={colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  closeButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  recipeTitle: { ...typography.meta, textAlign: 'center', marginTop: spacing.xs },
  stepPage: { width, padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { ...typography.bodyBold, color: colors.primary, marginBottom: spacing.lg },
  stepText: { fontSize: 28, lineHeight: 38, fontWeight: '600', color: colors.text, textAlign: 'center' },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
  },
  timerText: { fontSize: 22, fontWeight: '700', color: colors.white },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  navRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    backgroundColor: colors.secondary,
    borderRadius: 14,
    gap: spacing.xs,
  },
  navButtonDisabled: { opacity: 0.3 },
  navButtonText: { fontSize: 18, fontWeight: '700', color: colors.white },
});
