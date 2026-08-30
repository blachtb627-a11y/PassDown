import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import {
  addCircleMember,
  deleteCircle,
  fetchCircle,
  fetchCircleMembers,
  removeCircleMember,
} from '../lib/api/circles';
import { fetchCircleRecipes, removeRecipeFromCircle, shareRecipeToCircle } from '../lib/api/circleRecipes';
import { searchUsers } from '../lib/api/social';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { confirm, getErrorMessage, notify } from '../lib/alert';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';
import { Author, Recipe } from '../types/recipe';

export function CircleDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CircleDetail'>>();
  const { circleId } = route.params;
  const { currentUser, recipes, savedRecipeIds } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLeavingOrDeleting, setIsLeavingOrDeleting] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Author[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [sharedRecipes, setSharedRecipes] = useState<Recipe[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const [circle, memberList, recipeList] = await Promise.all([
        fetchCircle(circleId),
        fetchCircleMembers(circleId),
        fetchCircleRecipes(circleId),
      ]);
      setIsOwner(circle?.createdBy === currentUser.id);
      setMembers(memberList);
      setSharedRecipes(recipeList);
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
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      searchUsers(trimmed, currentUser.id)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query, currentUser.id]);

  const memberIds = new Set(members.map((m) => m.id));

  const handleAdd = async (user: Author) => {
    setBusyId(user.id);
    try {
      await addCircleMember(circleId, user.id, currentUser.id);
      setMembers((prev) => [...prev, user]);
      setQuery('');
      setSearchResults([]);
    } catch (error) {
      notify('Could not add member', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (user: Author) => {
    const ok = await confirm({ title: `Remove ${user.name} from this circle?`, confirmLabel: 'Remove' });
    if (!ok) return;
    setBusyId(user.id);
    try {
      await removeCircleMember(circleId, user.id);
      setMembers((prev) => prev.filter((m) => m.id !== user.id));
    } catch (error) {
      notify('Could not remove member', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const sharedRecipeIds = new Set(sharedRecipes.map((r) => r.id));
  const savedRecipes = recipes.filter((r) => savedRecipeIds.includes(r.id) && !r.isDraft);
  const shareableRecipes = shareSearchQuery.trim()
    ? savedRecipes.filter((r) => r.title.toLowerCase().includes(shareSearchQuery.trim().toLowerCase()))
    : savedRecipes;

  const handleToggleShare = async (recipe: Recipe) => {
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
    }
  };

  const handleLeaveOrDelete = async () => {
    const ok = await confirm({
      title: isOwner ? 'Delete this circle?' : 'Leave this circle?',
      message: isOwner
        ? 'This removes the circle for everyone in it. This cannot be undone.'
        : undefined,
      confirmLabel: isOwner ? 'Delete' : 'Leave',
    });
    if (!ok) return;
    setIsLeavingOrDeleting(true);
    try {
      if (isOwner) {
        await deleteCircle(circleId);
      } else {
        await removeCircleMember(circleId, currentUser.id);
      }
      navigation.goBack();
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Please try again.'));
      setIsLeavingOrDeleting(false);
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
    <SafeAreaView style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
                  <Pressable
                    key={recipe.id}
                    style={styles.recipeTile}
                    onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                    accessibilityRole="button"
                    accessibilityLabel={recipe.title}
                  >
                    <Image source={{ uri: recipe.photos[0] }} style={styles.recipeTilePhoto} />
                    <View style={styles.recipeTileCaption}>
                      <Text style={[typography.meta, styles.recipeTileTitle]} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Text style={[typography.subtitle, styles.sectionTitle]}>
              {members.length} member{members.length === 1 ? '' : 's'}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Image source={{ uri: item.avatarUri ?? 'https://picsum.photos/seed/circle-avatar/200' }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>{item.name}</Text>
              {item.username ? <Text style={typography.meta}>@{item.username}</Text> : null}
            </View>
            {isOwner && item.id !== currentUser.id ? (
              <PrimaryButton
                label="Remove"
                variant="outline"
                fullWidth={false}
                loading={busyId === item.id}
                onPress={() => handleRemove(item)}
              />
            ) : null}
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {isOwner ? (
              <>
                <Text style={[typography.subtitle, styles.sectionTitle]}>Add People</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search by name or username..."
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                />
                {isSearching ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.primary} /> : null}
                {searchResults
                  .filter((u) => !memberIds.has(u.id))
                  .map((user) => (
                    <View key={user.id} style={styles.memberRow}>
                      <Image
                        source={{ uri: user.avatarUri ?? 'https://picsum.photos/seed/circle-avatar/200' }}
                        style={styles.avatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={typography.bodyBold}>{user.name}</Text>
                        {user.username ? <Text style={typography.meta}>@{user.username}</Text> : null}
                      </View>
                      <PrimaryButton
                        label="Add"
                        fullWidth={false}
                        loading={busyId === user.id}
                        onPress={() => handleAdd(user)}
                      />
                    </View>
                  ))}
              </>
            ) : null}

            <View style={styles.leaveButtonWrapper}>
              <PrimaryButton
                label={isOwner ? 'Delete Circle' : 'Leave Circle'}
                variant="outline"
                icon={isOwner ? 'trash-outline' : 'exit-outline'}
                loading={isLeavingOrDeleting}
                onPress={handleLeaveOrDelete}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="people-outline" message="No members yet." />}
      />

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
    loading: { marginTop: spacing.xl },
    listContent: { padding: spacing.md },
    sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.md },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
      ...typography.body,
    },
    footer: { marginTop: spacing.md },
    leaveButtonWrapper: { marginTop: spacing.lg },
    recipesHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    recipesRow: { flexGrow: 0, marginBottom: spacing.sm },
    recipeTile: {
      width: 110,
      marginRight: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.secondary,
      overflow: 'hidden',
    },
    recipeTilePhoto: { width: 110, height: 110, backgroundColor: colors.border },
    recipeTileCaption: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, minHeight: 40 },
    recipeTileTitle: { color: colors.white },
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
