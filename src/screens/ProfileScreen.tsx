import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { fetchProfileWithCounts } from '../lib/api/social';
import { fetchRecipesByAuthor } from '../lib/api/recipes';
import { Author, Recipe } from '../types/recipe';
import { PrimaryButton } from '../components/PrimaryButton';
import { FilterChip } from '../components/FilterChip';
import { EmptyState } from '../components/EmptyState';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AppTypography, radius, spacing } from '../theme/typography';

const ALL_SAVED = 'all-saved';
type ProfileTab = 'yours' | 'saved';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { recipes, savedRecipeIds, collections, createCollection, followedAuthorIds, toggleFollowAuthor, currentUser } = useAppState();
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

  const handleNewCollection = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('New Collection', 'Name your new collection (e.g., "Christmas", "Quick Dinners")', (name) => {
        if (name && name.trim()) createCollection(name.trim());
      });
      return;
    }
    const untitledCount = collections.filter((c) => c.name.startsWith('Untitled Collection')).length;
    createCollection(untitledCount === 0 ? 'Untitled Collection' : `Untitled Collection ${untitledCount + 1}`);
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
  const visibleRecipes = isOwnProfile && activeTab === 'saved' ? visibleSavedRecipes : authoredRecipes;

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

            {isOwnProfile && activeTab === 'saved' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collectionsRow}>
                <FilterChip label="All Saved" selected={activeCollectionId === ALL_SAVED} onPress={() => setActiveCollectionId(ALL_SAVED)} />
                {collections.map((c) => (
                  <FilterChip
                    key={c.id}
                    label={c.name}
                    selected={activeCollectionId === c.id}
                    onPress={() => setActiveCollectionId(c.id)}
                  />
                ))}
                <Pressable onPress={handleNewCollection} style={styles.newCollectionChip} accessibilityRole="button" accessibilityLabel="New Collection">
                  <Ionicons name="add" size={18} color={colors.secondary} />
                  <Text style={[typography.bodyBold, { color: colors.secondary }]}> New</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={isOwnProfile && activeTab === 'saved' ? 'bookmark-outline' : 'restaurant-outline'}
            message={
              isOwnProfile && activeTab === 'saved'
                ? 'No recipes saved yet — tap the "Save" button on any recipe to start your collection.'
                : isOwnProfile
                ? 'No recipes posted yet — tap the "+" button to share your first one.'
                : 'No recipes posted yet.'
            }
          />
        }
        renderItem={({ item }) => (
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
        )}
      />
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
  });
}
