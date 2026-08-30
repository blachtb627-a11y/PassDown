import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { fetchCircleMembers } from '../lib/api/circles';
import { fetchCircleRecipes, removeRecipeFromCircle, shareRecipeToCircle } from '../lib/api/circleRecipes';
import { CircleMessage, fetchCircleMessages, sendCircleMessage, subscribeToCircleMessages } from '../lib/api/circleMessages';
import { PrimaryButton } from '../components/PrimaryButton';
import { SavedRecipeTile } from '../components/SavedRecipeTile';
import { EmptyState } from '../components/EmptyState';
import { getErrorMessage, notify } from '../lib/alert';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';
import { Author, Recipe } from '../types/recipe';

// The initial fetch and the realtime subscription both start concurrently on
// mount, so a message that arrives over the socket before the fetch resolves
// must not be clobbered by it — merge by id (keeping the newer copy) and
// re-sort instead of overwriting the list outright.
function mergeMessages(existing: CircleMessage[], incoming: CircleMessage[]): CircleMessage[] {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const headerButtonStyle = {
  minWidth: 44,
  minHeight: 44,
  paddingHorizontal: spacing.sm,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

export function CircleDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CircleDetail'>>();
  const { circleId } = route.params;
  const { currentUser, recipes, savedRecipeIds } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [members, setMembers] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sharedRecipes, setSharedRecipes] = useState<Recipe[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');

  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesListRef = useRef<FlatList>(null);
  const [shareBusyIds, setShareBusyIds] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('CircleMembers', { circleId })}
          accessibilityRole="button"
          accessibilityLabel="See circle members"
          style={headerButtonStyle}
        >
          <Ionicons name="people-outline" size={18} color={colors.secondary} />
          <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: 13, marginLeft: 4 }}>Members</Text>
        </Pressable>
      ),
    });
  }, [navigation, circleId, colors]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [memberList, recipeList, messageList] = await Promise.all([
        fetchCircleMembers(circleId),
        fetchCircleRecipes(circleId),
        fetchCircleMessages(circleId),
      ]);
      setMembers(memberList);
      setSharedRecipes(recipeList);
      setMessages((prev) => mergeMessages(prev, messageList));
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Could not load this circle.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  useEffect(() => {
    const unsubscribe = subscribeToCircleMessages(circleId, (message) => {
      setMessages((prev) => mergeMessages(prev, [message]));
    });
    return unsubscribe;
  }, [circleId]);

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setMessageText('');
    try {
      const sent = await sendCircleMessage(circleId, currentUser.id, text);
      setMessages((prev) => mergeMessages(prev, [sent]));
    } catch (error) {
      notify('Could not send message', getErrorMessage(error, 'Please try again.'));
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  };

  const sharedRecipeIds = new Set(sharedRecipes.map((r) => r.id));
  const savedRecipes = recipes.filter((r) => savedRecipeIds.includes(r.id) && !r.isDraft);
  const shareableRecipes = shareSearchQuery.trim()
    ? savedRecipes.filter((r) => r.title.toLowerCase().includes(shareSearchQuery.trim().toLowerCase()))
    : savedRecipes;

  const handleToggleShare = async (recipe: Recipe) => {
    if (shareBusyIds.has(recipe.id)) return;
    setShareBusyIds((prev) => new Set(prev).add(recipe.id));
    const isShared = sharedRecipeIds.has(recipe.id);
    setSharedRecipes((prev) => (isShared ? prev.filter((r) => r.id !== recipe.id) : [recipe, ...prev]));
    try {
      if (isShared) {
        await removeRecipeFromCircle(circleId, recipe.id);
      } else {
        await shareRecipeToCircle(circleId, recipe.id);
      }
    } catch (error) {
      setSharedRecipes((prev) => (isShared ? [recipe, ...prev] : prev.filter((r) => r.id !== recipe.id)));
      notify('Something went wrong', getErrorMessage(error, 'Could not update this recipe.'));
    } finally {
      setShareBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(recipe.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={messagesListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <>
              <View style={styles.recipesHeaderRow}>
                <Text style={typography.subtitle}>Shared Recipes</Text>
                <PrimaryButton label="Share a Recipe" variant="outline" fullWidth={false} onPress={() => setIsShareModalOpen(true)} />
              </View>
              {sharedRecipes.length === 0 ? (
                <EmptyState icon="restaurant-outline" message="No recipes shared yet — tap “Share a Recipe” to add one of yours." />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipesRow}>
                  {sharedRecipes.map((recipe) => (
                    <SavedRecipeTile
                      key={recipe.id}
                      recipe={recipe}
                      style={styles.recipeTile}
                      onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                    />
                  ))}
                </ScrollView>
              )}

              <Text style={[typography.subtitle, styles.sectionTitle]}>Chat</Text>
            </>
          }
          ListEmptyComponent={
            <EmptyState icon="chatbubbles-outline" message="No messages yet — say hello to the circle!" />
          }
          renderItem={({ item }) => {
            const author = membersById.get(item.authorId);
            const isOwn = item.authorId === currentUser.id;
            return (
              <View style={styles.messageRow}>
                <Text style={typography.bodyBold}>{isOwn ? 'You' : author?.name ?? 'Someone'}</Text>
                <Text style={typography.body}>{item.text}</Text>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.messageInput}
            placeholder="Message the circle..."
            placeholderTextColor={colors.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <PrimaryButton label="Send" fullWidth={false} loading={isSending} disabled={!messageText.trim()} onPress={handleSend} />
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isShareModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsShareModalOpen(false);
          setShareSearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setIsShareModalOpen(false);
            setShareSearchQuery('');
          }}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.subtitle, styles.modalTitle]}>Share a Saved Recipe</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your saved recipes..."
              placeholderTextColor={colors.textMuted}
              value={shareSearchQuery}
              onChangeText={setShareSearchQuery}
            />
            {savedRecipes.length === 0 ? (
              <Text style={[typography.body, styles.modalHint]}>
                No saved recipes yet — save one from the feed first, then share it here.
              </Text>
            ) : shareableRecipes.length === 0 ? (
              <Text style={[typography.body, styles.modalHint]}>No saved recipes matched your search.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {shareableRecipes.map((recipe) => {
                  const isShared = sharedRecipeIds.has(recipe.id);
                  return (
                    <Pressable
                      key={recipe.id}
                      style={styles.recipeOptionRow}
                      onPress={() => handleToggleShare(recipe)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isShared }}
                    >
                      <Ionicons name={isShared ? 'checkbox' : 'square-outline'} size={22} color={isShared ? colors.secondary : colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={typography.body} numberOfLines={1}>
                          {' '}
                          {recipe.title}
                        </Text>
                        <Text style={[typography.meta, { marginLeft: spacing.md }]} numberOfLines={1}>
                          by {recipe.author.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={{ height: spacing.md }} />
            <PrimaryButton
              label="Done"
              variant="outline"
              onPress={() => {
                setIsShareModalOpen(false);
                setShareSearchQuery('');
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    loading: { marginTop: spacing.xl },
    listContent: { padding: spacing.md, flexGrow: 1 },
    sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.md },
    recipesHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    recipesRow: { flexGrow: 0, marginBottom: spacing.sm },
    recipeTile: { width: 90, marginRight: spacing.sm },
    messageRow: { marginBottom: spacing.md },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    messageInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.sm,
      minHeight: 44,
      maxHeight: 120,
      backgroundColor: colors.surface,
      ...typography.body,
    },
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
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      minHeight: 44,
      backgroundColor: colors.background,
      marginBottom: spacing.sm,
      ...typography.body,
    },
    modalHint: { color: colors.textMuted, marginBottom: spacing.sm },
    recipeOptionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  });
}
