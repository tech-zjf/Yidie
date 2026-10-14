import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { CalendarScreen } from '../features/calendar/CalendarScreen';
import { BatchReview } from '../features/import/BatchReview';
import { changeDraftDates } from '../domain/batchDraft';
import type { AppServices } from '../services';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { colors } from '../ui/tokens';
import { scenarios, calendarFixture, importFixture } from './fixtures';
import { previewServices } from './services';

export default function PreviewRoot() {
  const [scene, setScene] = useState(0),
    [showImport, setShowImport] = useState(false),
    [controls, setControls] = useState(true);
  const [loaded, setLoaded] = useState<{ scene: number; services: AppServices } | null>(null);
  const services = loaded?.scene === scene ? loaded.services : null;
  const [drafts, setDrafts] = useState(importFixture);
  const [ready] = useFonts({
    YidieDisplay: require('../../assets/fonts/YidieDisplay.ttf'),
    YidieDisplayItalic: require('../../assets/fonts/YidieDisplayItalic.ttf'),
    BagelFatOne: require('../../assets/fonts/BagelFatOne-Regular.ttf'),
  });
  useEffect(() => {
    let active = true;
    async function load() {
      const next = await previewServices(calendarFixture(scene).entries);
      if (active) setLoaded({ scene, services: next });
    }
    void load();
    return () => {
      active = false;
    };
  }, [scene]);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <Modal visible={controls} animationType="slide" onRequestClose={() => setControls(false)}>
          <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: colors.paper }}>
            <Text style={{ textAlign: 'center', fontSize: 12 }}>
              UI preview · sample artwork · no real photos are accessed or changed
            </Text>
            <ScrollView>
              {scenarios.map((title, i) => (
                <Button
                  key={title}
                  label={title}
                  onPress={() => {
                    setScene(i);
                    setShowImport(false);
                    setControls(false);
                  }}
                />
              ))}
              <Button
                label="Import review"
                onPress={() => {
                  setDrafts(importFixture());
                  setShowImport(true);
                  setControls(false);
                }}
              />
            </ScrollView>
            <Button label="Close preview menu" onPress={() => setControls(false)} />
          </SafeAreaView>
        </Modal>
        {ready &&
          services &&
          (showImport ? (
            <SafeAreaView style={{ flex: 1, padding: 20 }}>
              <BatchReview
                drafts={drafts}
                failures={[
                  {
                    asset: { id: 'unavailable', createdAt: null, width: 1, height: 1 },
                    code: 'SOURCE_NOT_LOCAL',
                  },
                ]}
                busy={false}
                onRemove={(id) => setDrafts(drafts.filter((draft) => draft.photo.id !== id))}
                onToggle={(id) =>
                  setDrafts(
                    drafts.map((draft) =>
                      draft.photo.id === id ? { ...draft, include: !draft.include } : draft,
                    ),
                  )
                }
                onDates={(ids, value) => {
                  try {
                    setDrafts(changeDraftDates(drafts, ids, value));
                    return true;
                  } catch {
                    Alert.alert('Enter a valid date.');
                    return false;
                  }
                }}
                onRetry={() => Alert.alert('Preview only. Your photo library is not accessed.')}
                onConfirm={() => Alert.alert('Preview only. No local records were saved.')}
              />
            </SafeAreaView>
          ) : (
            <CalendarScreen
              key={scene}
              services={services}
              initialMonth={calendarFixture(scene).month}
              today="2026-06-23"
              onReloadServices={() => {}}
            />
          ))}
        <View style={{ position: 'absolute', top: 90, right: 8 }}>
          <Button label="Preview scenes" onPress={() => setControls(true)} />
        </View>
      </View>
    </SafeAreaProvider>
  );
}
