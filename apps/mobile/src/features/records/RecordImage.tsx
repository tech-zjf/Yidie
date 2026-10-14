import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { Entry, PhotoPreview } from '../../domain/records';
import { entryImage } from '../../domain/entryImage';
import type { AppServices } from '../../services';
import { colors } from '../../ui/tokens';

/** All record surfaces share resource selection and cache identity. Originals are never list sources. */
export function RecordImage({
  entry,
  services,
  variant = 'thumbnail',
  style,
  accessibilityLabel,
  photoFit = 'contain',
}: {
  entry: Entry;
  services: AppServices;
  variant?: 'thumbnail' | 'detail';
  style: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  photoFit?: 'contain' | 'cover';
}) {
  const [repaired, setRepaired] = useState<{ id: string; preview: PhotoPreview } | null>(null);
  const resource = entryImage(
    entry,
    variant,
    repaired?.id === entry.id ? repaired.preview : undefined,
  );
  const needsPreview = resource === null;
  useEffect(() => {
    if (!needsPreview) return;
    let active = true;
    async function repair() {
      try {
        const preview = await services.images.ensurePreview(entry.id);
        if (active) setRepaired({ id: entry.id, preview });
      } catch {
        // The record remains available; missing/invalid originals do not trigger library reads.
      }
    }
    void repair();
    return () => {
      active = false;
    };
  }, [entry.id, needsPreview, services]);
  const processing = entry.status === 'queued' || entry.status === 'running';
  return (
    <View style={style} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
      {resource ? (
        <Image
          source={{ uri: services.rootUri + resource.path, cacheKey: resource.cacheKey }}
          recyclingKey={resource.cacheKey}
          accessible={false}
          contentFit={resource.kind === 'photo' ? photoFit : 'contain'}
          style={[StyleSheet.absoluteFill, resource.kind === 'photo' && styles.photo]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.photo]} />
      )}
      {processing && (
        <View style={styles.progress} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.action} />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  photo: { borderRadius: 8, backgroundColor: colors.wash },
  progress: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
