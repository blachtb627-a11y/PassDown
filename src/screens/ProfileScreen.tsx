import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../context/AppStateContext';
import { fetchProfileWithCounts } from '../lib/api/social';
import { fetchRecipesByAuthor } from '../lib/api/recipes';
import { Author, Recipe } from '../types/recipe';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { radius, spacing, typography } from '../theme/typography';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { recipes, followedAuthorIds, toggleFollowAuthor, currentUser } = useAppState();
  const routeUserId = (route.params as { userId?: string } | undefined)?.userId;
  const isOwnProfile = !routeUserId || routeUserId === currentUser.id;
  const userId = isOwnProfile ? currentUser.id : routeUserId!;

  const [otherProfile, setOtherProfile] = useState<Author | null>(null);
  const [otherRecipes, setOtherRecipes] = useState<Recipe[]>([]);
  const [isLoadingOther, setIsLoadingOther] = useState(!isOwnProfile);

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

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={authoredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={typography.display}>{isOwnProfile ? 'Profile' : profileAuthor.name}</Text>
              {isOwnProfile ? (
                <Pressable
                  onPress={() => navigation.navigate('Settings')}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  style={styles.settingsButton}
                >
                  <Ionicons name="settings-outline" size={24} color={colors.secondary} />
                </Pressable>
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

            <Text style={[typography.subtitle, styles.recipesLabel]}>
              {isOwnProfile ? 'Your Recipes' : `${profileAuthor.name}'s Recipes`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            message={isOwnProfile ? 'No recipes posted yet — tap the "+" button to share your first one.' : 'No recipes posted yet.'}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
  countsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  recipesLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  gridItem: { flex: 1, gap: spacing.xs },
  gridPhoto: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.border },
});
