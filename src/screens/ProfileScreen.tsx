import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { fetchProfileWithCounts } from '../lib/api/social';
import { fetchRecipesByAuthor } from '../lib/api/recipes';
import { Author, Collection, Recipe } from '../types/recipe';
import { PrimaryButton } from '../components/PrimaryButton';
import { FilterChip } from '../components/FilterChip';
import { SavedRecipeTile } from '../components/SavedRecipeTile';
import { EmptyState } from '../components/EmptyState';
import { confirm, getErrorMessage, notify } from '../lib/alert';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';

const ALL_SAVED = 'all-saved';
type ProfileTab = 'yours' | 'saved';
type NameModalState = { mode: 'create' | 'rename'; collectionId?: string; value: string };

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const {
    recipes,
    savedRecipeIds,
    collections,
    createCollection,
    renameCollection,
    deleteCollection,
    addRecipeToCollection,
    removeRecipeFromCollection,
    followedAuthorIds,
    toggleFollowAuthor,
    currentUser,
  } = useAppState();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const routeUserId = (route.params as { userId?: string } | undefined)?.userId;
  const isOwnProfile = !routeUserId || routeUserId === currentUser.id;
  const userId = isOwnProfile ? currentUser.id : routeUserId!;

  const [otherProfile, setOtherProfile] = useState<Author | null>(null);
  const [otherRecipes, setOtherRecipes] = useState<Recipe[]>([]);
  const [isLoadingOther, setIsLoadingOther] = useState(!isOwnProfile);
  const [activeTab, setActiveTab] = useState<ProfileTab>('yours');
  const [activeCollectionId, setActiveCollectionId] = useState<string>(ALL_SAVED);
  const [nameModal, setNameModal] = useState<NameModalState | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [assignRecipeId, setAssignRecipeId] = useState<string | null>(null);

  useEffect(() => {
    if (isOwnProfile) return;
    let cancelled = false;
    setIsLoadingOther(true);
    Promise.all([fetchProfileWithCounts(userId), fetchRecipesByAuthor(userId)])
      .then(([profile, recs]) => {
        if (cancelled) return;
        setOtherProfile(profile);
        setOtherRecipes(recs);
      })
      .catch((error) => console.error('Failed to load profile', error))
      .finally(() => {
        if (!cancelled) setIsLoadingOther(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, userId]);

  const profileAuthor = isOwnProfile ? currentUser : otherProfile;
  const authoredRecipes = isOwnProfile ? recipes.filter((r) => r.author.id === currentUser.id) : otherRecipes;

  const savedRecipes = recipes.filter((r) => savedRecipeIds.includes(r.id));
  const visibleSavedRecipes =
    activeCollectionId === ALL_SAVED
      ? savedRecipes
      : savedRecipes.filter((r) => collections.find((c) => c.id === activeCollectionId)?.recipeIds.includes(r.id));

  const openEditCollection = (collection: Collection) =>
    setNameModal({ mode: 'rename', collectionId: collection.id, value: collection.name });

  const handleSaveName = async () => {
    if (!nameModal) return;
    const name = nameModal.value.trim();
    if (!name) return;
    setIsSavingName(true);
    try {
      if (nameModal.mode === 'create') {
        await createCollection(name);
      } else if (nameModal.collectionId) {
        await renameCollection(nameModal.collectionId, name);
      }
      setNameModal(null);
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Could not save this collection.'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!nameModal?.collectionId) return;
    const ok = await confirm({
      title: 'Delete this collection?',
      message: 'Recipes in it stay saved — they just won’t be grouped here anymore.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setIsSavingName(true);
    try {
      await deleteCollection(nameModal.collectionId);
      setActiveCollectionId((prev) => (prev === nameModal.collectionId ? ALL_SAVED : prev));
      setNameModal(null);
    } catch (error) {
      notify('Could not delete collection', getErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleToggleAssign = async (collectionId: string, recipeId: string, isIn: boolean) => {
    try {
      if (isIn) {
        await removeRecipeFromCollection(collectionId, recipeId);
      } else {
        await addRecipeToCollection(collectionId, recipeId);
      }
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error, 'Could not update this collection.'));
    }
  };

  if (!isOwnProfile && isLoadingOther) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profileAuthor) {
    return <EmptyState icon="person-circle-outline" message="This profile couldn't be found." />;
  }

  const isFollowing = followedAuthorIds.includes(profileAuthor.id);
  const isSavedTab = isOwnProfile && activeTab === 'saved';
  const visibleRecipes = isSavedTab ? visibleSavedRecipes : authoredRecipes;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={visibleRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={typography.display}>{isOwnProfile ? 'Profile' : profileAuthor.name}</Text>
              {isOwnProfile ? (
                <View style={styles.headerActions}>
                  <Pressable
                    onPress={() => navigation.navigate('ShoppingList')}
                    accessibilityRole="button"
                    accessibilityLabel="Shopping List"
                    style={styles.settingsButton}
                  >
                    <Ionicons name="cart-outline" size={24} color={colors.secondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate('Settings')}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                    style={styles.settingsButton}
                  >
                    <Ionicons name="settings-outline" size={24} color={colors.secondary} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.profileRow}>
              <Image
                source={{ uri: profileAuthor.avatarUri ?? 'https://picsum.photos/seed/you-avatar/200' }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={typography.subtitle}>{profileAuthor.name}</Text>
                {profileAuthor.username ? <Text style={typography.meta}>@{profileAuthor.username}</Text> : null}
                {profileAuthor.bio ? <Text style={typography.body}>{profileAuthor.bio}</Text> : null}
                <View style={styles.countsRow}>
                  <Text style={typography.meta}>
                    <Text style={typography.bodyBold}>{authoredRecipes.length}</Text> recipes
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      navigation.navigate('FollowList', { userId: profileAuthor.id, mode: 'followers', title: 'Followers' })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${profileAuthor.followerCount} followers`}
                  >
                    <Text style={typography.meta}>
                      <Text style={typography.bodyBold}>{profileAuthor.followerCount}</Text> followers
                    </Text>
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      navigation.navigate('FollowList', { userId: profileAuthor.id, mode: 'following', title: 'Following' })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${profileAuthor.followingCount} following`}
                  >
                    <Text style={typography.meta}>
                      <Text style={typography.bodyBold}>{profileAuthor.followingCount}</Text> following
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {!isOwnProfile ? (
              <PrimaryButton
                label={isFollowing ? 'Following' : 'Follow'}
                variant={isFollowing ? 'outline' : 'primary'}
                onPress={() => toggleFollowAuthor(profileAuthor.id)}
              />
            ) : (
              <PrimaryButton label="Edit Profile" variant="outline" onPress={() => navigation.navigate('EditProfile')} />
            )}

            {isOwnProfile ? (
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tabButton, activeTab === 'yours' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('yours')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeTab === 'yours' }}
                >
                  <Text style={[typography.bodyBold, activeTab === 'yours' ? styles.tabTextActive : styles.tabTextInactive]}>
                    Your Recipes
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('saved')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeTab === 'saved' }}
                >
                  <Text style={[typography.bodyBold, activeTab === 'saved' ? styles.tabTextActive : styles.tabTextInactive]}>
                    Saved
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[typography.subtitle, styles.recipesLabel]}>{`${profileAuthor.name}'s Recipes`}</Text>
            )}

            {isSavedTab ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collectionsRow}>
                <FilterChip label="All Saved" selected={activeCollectionId === ALL_SAVED} onPress={() => setActiveCollectionId(ALL_SAVED)} />
                {collections.map((c) => {
                  const selected = activeCollectionId === c.id;
                  return (
                    <View key={c.id} style={[styles.collectionChip, selected && styles.collectionChipSelected]}>
                      <Pressable
                        onPress={() => setActiveCollectionId(c.id)}
                        style={styles.collectionChipLabel}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={c.name}
                      >
                        <Text style={[typography.bodyBold, { color: selected ? colors.white : colors.secondary }]} numberOfLines={1}>
                          {c.name}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openEditCollection(c)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${c.name}`}
                      >
                        <Ionicons name="pencil" size={14} color={selected ? colors.white : colors.secondary} />
                      </Pressable>
                    </View>
                  );
                })}
                <Pressable
                  onPress={() => setNameModal({ mode: 'create', value: '' })}
                  style={styles.newCollectionChip}
                  accessibilityRole="button"
                  accessibilityLabel="New Collection"
                >
                  <Ionicons name="add" size={18} color={colors.secondary} />
                  <Text style={[typography.bodyBold, { color: colors.secondary }]}> New</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={isSavedTab ? 'bookmark-outline' : 'restaurant-outline'}
            message={
              isSavedTab
                ? 'No recipes saved yet — tap the "Save" button on any recipe to start your collection.'
                : isOwnProfile
                ? 'No recipes posted yet — tap the "+" button to share your first one.'
                : 'No recipes posted yet.'
            }
          />
        }
        renderItem={({ item }) =>
          isSavedTab ? (
            <SavedRecipeTile
              recipe={item}
              style={styles.gridItem}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
              overlay={
                <Pressable
                  onPress={() => setAssignRecipeId(item.id)}
                  hitSlop={6}
                  style={styles.collectionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Add to collection"
                >
                  <Ionicons name="folder-outline" size={16} color={colors.white} />
                </Pressable>
              }
            />
          ) : (
            <Pressable
              style={styles.gridItem}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <Image source={{ uri: item.photos[0] }} style={styles.gridPhoto} />
              <Text style={typography.bodyBold} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
          )
        }
      />

      <Modal visible={!!nameModal} transparent animationType="fade" onRequestClose={() => setNameModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setNameModal(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.subtitle, styles.modalTitle]}>
              {nameModal?.mode === 'create' ? 'New Collection' : 'Rename Collection'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder='e.g., "Christmas", "Quick Dinners"'
              placeholderTextColor={colors.textMuted}
              value={nameModal?.value ?? ''}
              onChangeText={(v) => setNameModal((prev) => (prev ? { ...prev, value: v } : prev))}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              label={nameModal?.mode === 'create' ? 'Create' : 'Save'}
              disabled={!nameModal?.value.trim()}
              loading={isSavingName}
              onPress={handleSaveName}
            />
            {nameModal?.mode === 'rename' ? (
              <>
                <View style={{ height: spacing.sm }} />
                <PrimaryButton
                  label="Delete Collection"
                  variant="outline"
                  icon="trash-outline"
                  loading={isSavingName}
                  onPress={handleDeleteCollection}
                />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!assignRecipeId} transparent animationType="fade" onRequestClose={() => setAssignRecipeId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignRecipeId(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.subtitle, styles.modalTitle]}>Add to Collection</Text>
            {collections.length === 0 ? (
              <Text style={[typography.body, styles.modalHint]}>
                You don't have any collections yet — tap "New" in the Saved tab's filter row to create one.
              </Text>
            ) : (
              collections.map((c) => {
                const isIn = assignRecipeId ? c.recipeIds.includes(assignRecipeId) : false;
                return (
                  <Pressable
                    key={c.id}
                    style={styles.collectionOptionRow}
                    onPress={() => assignRecipeId && handleToggleAssign(c.id, assignRecipeId, isIn)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isIn }}
                  >
                    <Ionicons name={isIn ? 'checkbox' : 'square-outline'} size={22} color={isIn ? colors.secondary : colors.textMuted} />
                    <Text style={typography.body}> {c.name}</Text>
                  </Pressable>
                );
              })
            )}
            <View style={{ height: spacing.md }} />
            <PrimaryButton label="Done" variant="outline" onPress={() => setAssignRecipeId(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, typography: AppTypography) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    settingsButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    profileRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
    countsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    recipesLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
    tabRow: { flexDirection: 'row', marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: { borderBottomColor: colors.secondary },
    tabTextActive: { color: colors.secondary },
    tabTextInactive: { color: colors.textMuted },
    collectionsRow: { flexGrow: 0, marginTop: spacing.md },
    collectionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 44,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.secondary,
      marginRight: spacing.sm,
      backgroundColor: colors.surface,
    },
    collectionChipSelected: { backgroundColor: colors.secondary },
    collectionChipLabel: { maxWidth: 160 },
    newCollectionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.secondary,
      borderStyle: 'dashed',
      marginRight: spacing.sm,
    },
    gridItem: { flex: 1, gap: spacing.xs },
    gridPhoto: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
    collectionButton: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
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
    modalHint: { color: colors.textMuted, marginBottom: spacing.sm },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      minHeight: 48,
      backgroundColor: colors.background,
      ...typography.body,
    },
    collectionOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
    },
  });
}
