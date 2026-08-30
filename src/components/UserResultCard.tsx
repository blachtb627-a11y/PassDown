import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Author } from '../types/recipe';
import { PrimaryButton } from './PrimaryButton';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/typography';

type Props = {
  user: Author;
  isFollowing: boolean;
  isFollowBusy?: boolean;
  onToggleFollow: () => void;
  onPress: () => void;
};

export function UserResultCard({ user, isFollowing, isFollowBusy, onToggleFollow, onPress }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={user.name}>
      <Image source={{ uri: user.avatarUri ?? 'https://picsum.photos/seed/user-avatar/200' }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={typography.bodyBold} numberOfLines={1}>
          {user.name}
        </Text>
        {user.username ? (
          <Text style={typography.meta} numberOfLines={1}>
            @{user.username}
          </Text>
        ) : null}
        {user.bio ? (
          <Text style={typography.meta} numberOfLines={1}>
            {user.bio}
          </Text>
        ) : null}
      </View>
      <View style={styles.followButton}>
        <PrimaryButton
          label={isFollowing ? 'Following' : 'Follow'}
          variant={isFollowing ? 'outline' : 'primary'}
          fullWidth={false}
          loading={isFollowBusy}
          onPress={onToggleFollow}
        />
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
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
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
    info: { flex: 1 },
    followButton: { minWidth: 96 },
  });
}
