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
              UI 预览 · 几何占位图 · 不读写真实照片
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
                label="导入确认"
                onPress={() => {
                  setDrafts(importFixture());
                  setShowImport(true);
                  setControls(false);
                }}
              />
            </ScrollView>
            <Button label="关闭场景选择" onPress={() => setControls(false)} />
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
                    Alert.alert('请输入有效日期');
                    return false;
                  }
                }}
                onRetry={() => Alert.alert('仅预览，不读取相册')}
                onConfirm={() => Alert.alert('仅预览，不写入本地记录')}
              />
            </SafeAreaView>
          ) : (
            <CalendarScreen
              key={scene}
              services={services}
              initialMonth={calendarFixture(scene).month}
              today="2026-06-23"
            />
          ))}
        <View style={{ position: 'absolute', top: 90, right: 8 }}>
          <Button label="预览场景" onPress={() => setControls(true)} />
        </View>
      </View>
    </SafeAreaProvider>
  );
}
