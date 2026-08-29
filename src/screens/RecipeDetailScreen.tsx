import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { confirm, getErrorMessage, notify } from '../lib/alert';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';

const { width } = Dimensions.get('window');

export function RecipeDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecipeDetail'>>();
  const { recipeId, focusComments } = route.params;
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const {
    recipes,
    savedRecipeIds,
    likedRecipeIds,
    followedAuthorIds,
    toggleSaveRecipe,
    toggleLikeRecipe,
    toggleFollowAuthor,
    addRecipeIngredientsToShoppingList,
    addComment,
    deleteRecipe,
    currentUser,
  } = useAppState();

  const recipe = recipes.find((r) => r.id === recipeId);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const hasScrolledToComments = useRef(false);

  if (!recipe) {
    return <EmptyState icon="alert-circle-outline" message="This recipe couldn't be found." />;
  }

  const isSaved = savedRecipeIds.includes(recipe.id);
  const isLiked = likedRecipeIds.includes(recipe.id);
  const isFollowing = followedAuthorIds.includes(recipe.author.id);
  const isOwnRecipe = recipe.author.id === currentUser.id;
  const totalTime = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  const activity = useMemo(() => {
    const madeThis = recipe.madeThisPosts.map((m) => ({ type: 'madeThis' as const, data: m, key: m.id }));
    const comments = recipe.comments.map((c) => ({ type: 'comment' as const, data: c, key: c.id }));
    return [...madeThis, ...comments];
  }, [recipe]);

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this recipe?',
      message: 'This permanently deletes the recipe along with its comments and "I made this!" posts. This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteRecipe(recipe.id);
      navigation.goBack();
    } catch (error) {
      notify('Could not delete recipe', getErrorMessage(error, 'Please try again.'));
      setIsDeleting(false);
    }
  };

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.content}>
      <FlatList
        data={recipe.photos}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <Image source={{ uri: item }} style={styles.heroPhoto} />}
      />

      <View style={styles.section}>
        <View style={styles.titleRow}>
          <Text style={[typography.title, styles.titleText]}>{recipe.title}</Text>
          {recipe.isPrivate ? (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
              <Text style={typography.meta}> Private</Text>
            </View>
          ) : null}
        </View>
        {recipe.story ? <Text style={[typography.body, styles.story]}>{recipe.story}</Text> : null}

        <View style={styles.statsRow}>
          {totalTime > 0 ? <Text style={typography.meta}>⏱ {totalTime} min total</Text> : null}
          {recipe.servings ? <Text style={typography.meta}>🍽 Serves {recipe.servings}</Text> : null}
          {recipe.difficulty ? <Text style={typography.meta}>{recipe.difficulty}</Text> : null}
        </View>

        <View style={styles.actionsBar}>
          <Pressable
            style={styles.actionBarButton}
            onPress={() => toggleLikeRecipe(recipe.id)}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
          >
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? colors.primary : colors.text} />
            <Text style={typography.meta}>{recipe.likeCount}</Text>
          </Pressable>
          <Pressable
            style={styles.actionBarButton}
            onPress={() => toggleSaveRecipe(recipe.id)}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from Recipe Box' : 'Save'}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? colors.secondary : colors.text}
            />
            <Text style={typography.meta}>{isSaved ? 'Saved' : 'Save'}</Text>
          </Pressable>
          <Pressable
            style={styles.actionBarButton}
            onPress={() => Share.share({ message: `Check out "${recipe.title}" on PassDown!` })}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Ionicons name="share-outline" size={24} color={colors.text} />
            <Text style={typography.meta}>Share</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.buttonStack}>
        <PrimaryButton
          label="Start Cook Mode"
          icon="restaurant-outline"
          onPress={() => navigation.navigate('CookMode', { recipeId: recipe.id })}
        />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton
          label="Add to Shopping List"
          icon="cart-outline"
          variant="outline"
          onPress={async () => {
            try {
              await addRecipeIngredientsToShoppingList(recipe);
              notify('Added!', 'Ingredients added to your Shopping List.');
            } catch (error) {
              notify('Something went wrong', 'Could not add ingredients to your Shopping List.');
            }
          }}
        />
        {isOwnRecipe ? (
          <>
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              label="Edit Recipe"
              icon="create-outline"
              variant="outline"
              onPress={() => navigation.navigate('PostRecipe', { recipeId: recipe.id })}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              label="Delete Recipe"
              icon="trash-outline"
              variant="outline"
              loading={isDeleting}
              onPress={handleDelete}
            />
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={typography.subtitle}>Ingredients</Text>
        {recipe.ingredients.map((ing) => {
          const checked = !!checkedIngredients[ing.id];
          return (
            <Pressable
              key={ing.id}
              style={styles.ingredientRow}
              onPress={() => setCheckedIngredients((prev) => ({ ...prev, [ing.id]: !prev[ing.id] }))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`${ing.quantity} ${ing.unit} ${ing.item}`}
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={24}
                color={checked ? colors.secondary : colors.textMuted}
              />
              <Text style={[typography.body, styles.ingredientText, checked && styles.ingredientChecked]}>
                {[ing.quantity, ing.unit, ing.item].filter(Boolean).join(' ')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={typography.subtitle}>Steps</Text>
        {recipe.steps.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={[typography.bodyBold, { color: colors.white }]}>{index + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={typography.body}>{step.text}</Text>
              {step.photoUri ? <Image source={{ uri: step.photoUri }} style={styles.stepPhoto} /> : null}
            </View>
          </View>
        ))}
      </View>

      <Pressable
        style={styles.authorStrip}
        onPress={() => navigation.navigate('UserProfile', { userId: recipe.author.id })}
        accessibilityRole="button"
        accessibilityLabel={`View ${recipe.author.name}'s profile`}
      >
        <Image source={{ uri: recipe.author.avatarUri }} style={styles.authorAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyBold}>{recipe.author.name}</Text>
          <Text style={typography.meta}>{recipe.author.followerCount} followers</Text>
        </View>
        {!isOwnRecipe ? (
          <PrimaryButton
            label={isFollowing ? 'Following' : 'Follow'}
            variant={isFollowing ? 'outline' : 'primary'}
            fullWidth={false}
            onPress={() => toggleFollowAuthor(recipe.author.id)}
          />
        ) : null}
      </Pressable>

      <View
        style={styles.section}
        onLayout={(e) => {
          if (!focusComments || hasScrolledToComments.current) return;
          hasScrolledToComments.current = true;
          const y = e.nativeEvent.layout.y;
          scrollViewRef.current?.scrollTo({ y, animated: true });
          commentInputRef.current?.focus();
        }}
      >
        <Text style={typography.subtitle}>Comments & "I Made This!"</Text>
        <View style={styles.commentInputRow}>
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="Add an encouraging comment..."
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <PrimaryButton
            label="Post"
            fullWidth={false}
            disabled={!commentText.trim()}
            onPress={() => {
              addComment(recipe.id, commentText.trim());
              setCommentText('');
            }}
          />
        </View>

        {activity.length === 0 ? (
          <EmptyState icon="chatbubble-outline" message="No comments yet — be the first to say hello!" />
        ) : (
          activity.map((entry) =>
            entry.type === 'madeThis' ? (
              <View key={entry.key} style={styles.madeThisCard}>
                <Image source={{ uri: entry.data.photoUri }} style={styles.madeThisPhoto} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.bodyBold}>{entry.data.authorName} made this! 🎉</Text>
                  {entry.data.note ? <Text style={typography.meta}>{entry.data.note}</Text> : null}
                </View>
              </View>
            ) : (
              <View key={entry.key} style={styles.commentRow}>
                <Text style={typography.bodyBold}>{entry.data.authorName}</Text>
                <Text style={typography.body}>{entry.data.text}</Text>
              </View>
            )
          )
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  heroPhoto: { width, height: width, backgroundColor: colors.border },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  titleText: { flexShrink: 1 },
  privateBadge: { flexDirection: 'row', alignItems: 'center' },
  story: { marginTop: spacing.sm, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' },
  actionsBar: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  actionBarButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginRight: spacing.xl, minHeight: 44 },
  buttonStack: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.sm, marginTop: spacing.sm },
  ingredientText: { flex: 1 },
  ingredientChecked: { textDecorationLine: 'line-through', color: colors.textMuted },
  stepRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1 },
  stepPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, marginTop: spacing.sm },
  authorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  commentInputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  madeThisCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  madeThisPhoto: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.border },
  commentRow: { marginTop: spacing.md },
  });
}
