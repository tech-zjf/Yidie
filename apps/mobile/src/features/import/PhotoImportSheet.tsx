import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import type { AppServices } from '../../services';
import type { Asset } from '../../domain/records';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors, fonts } from '../../ui/tokens';
import { copy } from '../../ui/copy';
import { usePhotoImport } from './usePhotoImport';

function PhotoTile({
  asset,
  services,
  onPress,
  disabled,
}: {
  asset: Asset;
  services: AppServices;
  onPress: () => void;
  disabled: boolean;
}) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void services.photos
      .thumbnail(asset.id)
      .then((value) => {
        if (active) setUri(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [asset.id, services]);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={asset.createdAt ?? copy.choose}
      onPress={onPress}
      style={styles.tile}
    >
      {uri ? (
        <Image source={uri} style={{ width: '100%', height: 140 }} contentFit="cover" />
      ) : (
        <Text style={styles.muted}>{copy.cloudThumb}</Text>
      )}
    </Pressable>
  );
}
export function PhotoImportSheet({
  services,
  selectedDate,
  onClose,
  onSaved,
}: {
  services: AppServices;
  selectedDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const model = usePhotoImport(services, selectedDate, onSaved);
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!model.busy) onClose();
      }}
    >
      <View style={styles.screen} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.heading}>{model.photo ? copy.dateTitle : copy.choose}</Text>
          <Button label={copy.cancel} onPress={onClose} disabled={model.busy} />
        </View>
        <Text style={styles.muted}>{copy.local}</Text>
        {!!model.notice && <Text accessibilityRole="alert">{model.notice}</Text>}
        {!!model.error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {model.error}
          </Text>
        )}
        {model.busy && (
          <View style={{ gap: 8 }}>
            <ActivityIndicator color={colors.action} />
            <Text style={styles.muted}>{model.photo ? copy.processing : copy.preparing}</Text>
          </View>
        )}
        {!model.permission ? (
          <View style={{ gap: 16, paddingTop: 40 }}>
            <Text>{copy.permissionHelp}</Text>
            <Button
              primary
              label={copy.permissionButton}
              onPress={model.authorize}
              disabled={model.busy}
            />
          </View>
        ) : model.photo ? (
          <View style={{ gap: 16 }}>
            <Image
              source={services.rootUri + model.photo.originalPath}
              style={{ width: '100%', height: 240 }}
              contentFit="contain"
            />
            <Text>{copy.source[model.proposal.source]}</Text>
            <TextInput
              accessibilityLabel={copy.dateLabel}
              placeholder={copy.datePlaceholder}
              value={model.date}
              onChangeText={model.setDate}
              editable={!model.busy}
              style={styles.input}
              autoCorrect={false}
            />
            <Text style={styles.muted}>{copy.dateHelp}</Text>
            <Button primary label={copy.make} onPress={model.confirm} disabled={model.busy} />
          </View>
        ) : (
          <FlatList
            data={model.assets}
            numColumns={3}
            keyExtractor={(a) => a.id}
            initialNumToRender={12}
            windowSize={5}
            renderItem={({ item }) => (
              <PhotoTile
                asset={item}
                services={services}
                onPress={() => model.choose(item)}
                disabled={model.busy}
              />
            )}
            ListEmptyComponent={<Text>{copy.noPhotos}</Text>}
            ListFooterComponent={
              model.hasMore ? (
                <Button label={copy.morePhotos} onPress={model.loadMore} disabled={model.busy} />
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 30 },
  muted: { color: colors.muted, fontSize: 13 },
  tile: {
    flex: 1,
    margin: 3,
    height: 140,
    backgroundColor: colors.wash,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  input: {
    minHeight: 50,
    padding: 12,
    backgroundColor: colors.wash,
    borderRadius: 12,
    fontSize: 18,
    fontFamily: fonts.body,
    color: colors.ink,
  },
});
