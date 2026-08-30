import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/typography';
import { notify } from '../../lib/alert';
import { scanRecipePhoto, ScannedRecipe } from '../../lib/api/aiRecipeScan';

const MAX_PHOTOS = 10;

type Props = {
  photos: string[];
  onChange: (photos: string[]) => void;
  onScanned: (recipe: ScannedRecipe, photoUri: string) => void;
};

export function PhotoStep({ photos, onChange, onScanned }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isScanning, setIsScanning] = useState(false);

  const addFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Photo access needed', 'Allow photo library access in Settings to add recipe photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  };

  const addFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify('Camera access needed', 'Allow camera access in Settings to take a recipe photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (uri: string) => onChange(photos.filter((p) => p !== uri));

  const scanFrom = async (launch: () => Promise<ImagePicker.ImagePickerResult>) => {
    const result = await launch();
    if (result.canceled) return;
    const photoUri = result.assets[0].uri;
    setIsScanning(true);
    try {
      const recipe = await scanRecipePhoto(photoUri);
      onChange([...photos, photoUri].slice(0, MAX_PHOTOS));
      onScanned(recipe, photoUri);
      notify('Recipe scanned!', 'Take a look and fix up anything it misread.');
    } catch (error) {
      notify('Could not read that recipe', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const scanFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify('Camera access needed', 'Allow camera access in Settings to scan a recipe.');
      return;
    }
    await scanFrom(() => ImagePicker.launchCameraAsync({ quality: 0.7 }));
  };

  const scanFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Photo access needed', 'Allow photo library access in Settings to scan a recipe.');
      return;
    }
    await scanFrom(() => ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.scanCard}>
        <View style={styles.scanHeader}>
          <Ionicons name="sparkles" size={20} color={colors.secondary} />
          <Text style={[typography.bodyBold, styles.scanTitle]}> Scan a Recipe Card</Text>
        </View>
        <Text style={[typography.body, styles.scanHelper]}>
          Have it written down already? Snap a photo and we'll fill in the title, ingredients, and steps for you.
        </Text>
        {isScanning ? (
          <View style={styles.scanLoading}>
            <ActivityIndicator color={colors.secondary} />
            <Text style={[typography.body, styles.scanLoadingText]}> Reading your recipe...</Text>
          </View>
        ) : (
          <View style={styles.scanButtonRow}>
            <View style={styles.scanButtonWrapper}>
              <PrimaryButton label="Take a Photo" icon="camera-outline" variant="outline" onPress={scanFromCamera} />
            </View>
            <View style={styles.scanButtonWrapper}>
              <PrimaryButton label="Choose Photo" icon="images-outline" variant="outline" onPress={scanFromLibrary} />
            </View>
          </View>
        )}
      </View>

      <Text style={typography.title}>Add a photo</Text>
      <Text style={[typography.body, styles.helper]}>
        A simple phone photo is perfect — one photo is required, up to {MAX_PHOTOS} total.
      </Text>

      <View style={styles.grid}>
        {photos.map((uri) => (
          <View key={uri} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photo} />
            <Pressable
              onPress={() => removePhoto(uri)}
              style={styles.removeButton}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Ionicons name="close" size={16} color={colors.white} />
            </Pressable>
          </View>
        ))}
      </View>

      {photos.length < MAX_PHOTOS ? (
        <View style={styles.buttonStack}>
          <PrimaryButton label="Take a Photo" icon="camera-outline" onPress={addFromCamera} />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton label="Choose from Library" icon="images-outline" variant="outline" onPress={addFromLibrary} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { padding: spacing.md },
    helper: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
    scanCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.secondary,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    scanHeader: { flexDirection: 'row', alignItems: 'center' },
    scanTitle: { color: colors.secondary },
    scanHelper: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
    scanButtonRow: { flexDirection: 'row', gap: spacing.sm },
    scanButtonWrapper: { flex: 1 },
    scanLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    scanLoadingText: { color: colors.secondary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    photoWrapper: { width: 100, height: 100 },
    photo: { width: '100%', height: '100%', borderRadius: radius.md, backgroundColor: colors.border },
    removeButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: colors.danger,
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonStack: { marginTop: spacing.sm },
  });
}
