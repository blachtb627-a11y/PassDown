import React, { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ad, recordAdClick } from '../lib/api/ads';
import { AppColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/typography';

type Props = { ad: Ad };

// A separate component (rather than a branch inside AdCard) so
// useVideoPlayer only ever runs for an actual video ad — it needs a real
// source up front, and Rules of Hooks means AdCard itself can't call it
// conditionally.
function AdVideoMedia({ url, style }: { url: string; style: ViewStyle }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView style={style} player={player} contentFit="cover" nativeControls={false} />;
}

export function AdCard({ ad }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = (
    <View style={styles.card}>
      <View style={styles.mediaWrapper}>
        {ad.mediaType === 'video' ? (
          <AdVideoMedia url={ad.mediaUrl} style={styles.media} />
        ) : (
          <Image source={{ uri: ad.mediaUrl }} style={styles.media} />
        )}
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
      </View>
      <Text style={[typography.bodyBold, styles.companyName]} numberOfLines={1}>
        {ad.companyName}
      </Text>
    </View>
  );

  if (!ad.linkUrl) return content;

  return (
    <Pressable
      onPress={() => {
        Linking.openURL(ad.linkUrl!);
        recordAdClick(ad.id).catch(() => {});
      }}
      accessibilityRole="button"
      accessibilityLabel={`${ad.companyName} advertisement`}
    >
      {content}
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    mediaWrapper: { position: 'relative' },
    media: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.border },
    sponsoredBadge: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    sponsoredText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    companyName: { padding: spacing.sm },
  });
}
