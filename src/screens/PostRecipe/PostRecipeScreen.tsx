import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAppState } from '../../context/AppStateContext';
import { Recipe } from '../../types/recipe';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';
import { ProgressBar } from './ProgressBar';
import { PhotoStep } from './PhotoStep';
import { TitleStoryStep } from './TitleStoryStep';
import { IngredientsStep } from './IngredientsStep';
import { StepsStep } from './StepsStep';
import { DetailsStep } from './DetailsStep';
import { ReviewStep } from './ReviewStep';
import { emptyFormState, nextId, RecipeFormState, STEP_TITLES } from './formTypes';

function recipeToForm(recipe: Recipe): RecipeFormState {
  return {
    photos: recipe.photos,
    title: recipe.title,
    story: recipe.story ?? '',
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prepMinutes: recipe.prepMinutes?.toString() ?? '',
    cookMinutes: recipe.cookMinutes?.toString() ?? '',
    servings: recipe.servings?.toString() ?? '',
    cuisine: recipe.cuisine ?? '',
    mealType: recipe.mealType ?? null,
    diet: recipe.diet ?? null,
    difficulty: recipe.difficulty ?? null,
    occasion: recipe.occasion ?? null,
  };
}

export function PostRecipeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PostRecipe'>>();
  const { recipes, addRecipe, updateRecipe, currentUser } = useAppState();

  const existingRecipe = route.params?.recipeId ? recipes.find((r) => r.id === route.params!.recipeId) : undefined;
  const [form, setForm] = useState<RecipeFormState>(existingRecipe ? recipeToForm(existingRecipe) : emptyFormState());
  const [stepIndex, setStepIndex] = useState(0);

  const patchForm = (patch: Partial<RecipeFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const canGoNext = () => {
    switch (stepIndex) {
      case 0:
        return form.photos.length >= 1;
      case 1:
        return form.title.trim().length > 0;
      case 2:
        return form.ingredients.some((i) => i.item.trim());
      case 3:
        return form.steps.some((s) => s.text.trim());
      default:
        return true;
    }
  };

  const buildRecipe = (isDraft: boolean): Recipe => ({
    id: existingRecipe?.id ?? nextId('recipe'),
    title: form.title.trim() || 'Untitled Recipe',
    story: form.story.trim() || undefined,
    photos: form.photos,
    author: existingRecipe?.author ?? currentUser,
    ingredients: form.ingredients.filter((i) => i.item.trim()),
    steps: form.steps.filter((s) => s.text.trim()),
    prepMinutes: form.prepMinutes ? Number(form.prepMinutes) : undefined,
    cookMinutes: form.cookMinutes ? Number(form.cookMinutes) : undefined,
    servings: form.servings ? Number(form.servings) : undefined,
    cuisine: form.cuisine.trim() || undefined,
    mealType: form.mealType ?? undefined,
    diet: form.diet ?? undefined,
    difficulty: form.difficulty ?? undefined,
    occasion: form.occasion ?? undefined,
    likeCount: existingRecipe?.likeCount ?? 0,
    commentCount: existingRecipe?.commentCount ?? 0,
    comments: existingRecipe?.comments ?? [],
    madeThisPosts: existingRecipe?.madeThisPosts ?? [],
    isDraft,
    createdAt: existingRecipe?.createdAt ?? new Date().toISOString(),
  });

  const saveRecipe = (isDraft: boolean) => {
    const recipe = buildRecipe(isDraft);
    if (existingRecipe) {
      updateRecipe(recipe);
    } else {
      addRecipe(recipe);
    }
    if (isDraft) {
      Alert.alert('Saved as Draft', 'Find it in your Profile to finish it later.');
      navigation.goBack();
    } else {
      navigation.goBack();
      navigation.navigate('RecipeDetail', { recipeId: recipe.id });
    }
  };

  const isLastStep = stepIndex === STEP_TITLES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ProgressBar stepIndex={stepIndex} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          {stepIndex === 0 && <PhotoStep photos={form.photos} onChange={(photos) => patchForm({ photos })} />}
          {stepIndex === 1 && (
            <TitleStoryStep
              title={form.title}
              story={form.story}
              onChangeTitle={(title) => patchForm({ title })}
              onChangeStory={(story) => patchForm({ story })}
            />
          )}
          {stepIndex === 2 && (
            <IngredientsStep ingredients={form.ingredients} onChange={(ingredients) => patchForm({ ingredients })} />
          )}
          {stepIndex === 3 && <StepsStep steps={form.steps} onChange={(steps) => patchForm({ steps })} />}
          {stepIndex === 4 && (
            <DetailsStep
              prepMinutes={form.prepMinutes}
              cookMinutes={form.cookMinutes}
              servings={form.servings}
              cuisine={form.cuisine}
              mealType={form.mealType}
              diet={form.diet}
              difficulty={form.difficulty}
              occasion={form.occasion}
              onChange={patchForm}
            />
          )}
          {stepIndex === 5 && <ReviewStep form={form} />}
        </View>

        <View style={styles.footer}>
          {isLastStep ? (
            <>
              <PrimaryButton label="Post Recipe" icon="checkmark-circle-outline" onPress={() => saveRecipe(false)} />
              <View style={{ height: spacing.sm }} />
              <PrimaryButton label="Save as Draft" variant="outline" onPress={() => saveRecipe(true)} />
            </>
          ) : (
            <View style={styles.navRow}>
              {stepIndex > 0 ? (
                <View style={styles.navButtonWrapper}>
                  <PrimaryButton label="Back" variant="outline" onPress={() => setStepIndex((i) => i - 1)} />
                </View>
              ) : null}
              <View style={styles.navButtonWrapper}>
                <PrimaryButton label="Next" disabled={!canGoNext()} onPress={() => setStepIndex((i) => i + 1)} />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  navRow: { flexDirection: 'row', gap: spacing.sm },
  navButtonWrapper: { flex: 1 },
});
