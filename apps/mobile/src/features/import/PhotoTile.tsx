import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { AppServices } from '../../services';
import type { Asset } from '../../domain/records';
import { Text } from '../../ui/Text';
import { colors } from '../../ui/tokens';
import { copy } from '../../ui/copy';

export function PhotoTile({
  asset,
  services,
  onPress,
  disabled,
  selected,
}: {
  asset: Asset;
  services: AppServices;
  onPress: () => void;
  disabled: boolean;
  selected: boolean;
}) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function loadPreview() {
      try {
        const value = await services.photos.thumbnail(asset.id);
        if (active) setUri(value);
      } catch {
        // An unavailable local preview never initiates a cloud download.
      }
    }
    void loadPreview();
    return () => {
      active = false;
    };
  }, [asset.id, services]);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={asset.createdAt ?? copy.choose}
      onPress={onPress}
      style={[styles.tile, selected && styles.selected]}
    >
      {uri ? (
        <Image source={uri} style={{ width: '100%', height: 134 }} contentFit="cover" />
      ) : (
        <Text style={styles.muted}>{copy.cloudThumb}</Text>
      )}
      {selected && <Text style={styles.mark}>✓</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 3,
    height: 140,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.wash,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  selected: { borderColor: colors.action },
  muted: { color: colors.muted, fontSize: 13 },
  mark: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    color: colors.paper,
    backgroundColor: colors.action,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
});
