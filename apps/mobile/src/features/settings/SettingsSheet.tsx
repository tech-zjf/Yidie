import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppServices } from '../../services';
import { errorCode } from '../../domain/importPhoto';
import { Button } from '../../ui/Button';
import { SheetHandle } from '../../ui/SheetHandle';
import { Text } from '../../ui/Text';
import { copy } from '../../ui/copy';
import { colors, fonts } from '../../ui/tokens';
import type { MonthExportPayload } from '../../domain/monthLayout';
import { useReducedMotion } from '../../ui/useReducedMotion';

function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsSheet({
  services,
  monthExport,
  onClose,
  onReloadServices,
}: {
  services: AppServices;
  monthExport: MonthExportPayload;
  onClose: () => void;
  onReloadServices: () => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [includeSignature, setIncludeSignature] = useState(false);
  const closing = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const frame = requestAnimationFrame(() => {
      Animated.spring(progress, {
        toValue: 1,
        damping: 27,
        stiffness: 250,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    });
    return () => cancelAnimationFrame(frame);
  }, [progress, reduceMotion]);

  const close = useCallback(() => {
    if (closing.current || busy) return;
    closing.current = true;
    if (reduceMotion) {
      onClose();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: 210,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
      else closing.current = false;
    });
  }, [busy, onClose, progress, reduceMotion]);

  async function exportBackup() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    let resume: (() => Promise<void>) | undefined;
    try {
      resume = await services.actions.queue.suspend();
      const saved = await services.photos.exportBackup();
      setMessage(saved ? copy.backupExported : copy.backupCancelled);
    } catch (cause) {
      setMessage(copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      await resume?.();
      setBusy(false);
    }
  }

  async function exportMonth() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const shared = await services.photos.shareMonth({ ...monthExport, includeSignature });
      setMessage(shared ? copy.monthExported : copy.shareCancelled);
    } catch (cause) {
      setMessage(copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      setBusy(false);
    }
  }

  async function prepareRestore() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const summary = await services.photos.prepareRestore();
      if (!summary) return;
      const description = copy.backupSummary(
        summary.entryCount,
        summary.assetCount,
        fileSize(summary.totalBytes),
      );
      Alert.alert(copy.restoreTitle, description, [
        {
          text: copy.cancel,
          style: 'cancel',
          onPress: () => void services.photos.discardRestore().catch(() => {}),
        },
        {
          text: copy.restoreConfirm,
          style: 'destructive',
          onPress: () => void activateRestore(),
        },
      ]);
    } catch (cause) {
      setMessage(copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED);
    } finally {
      setBusy(false);
    }
  }

  async function activateRestore() {
    if (busy) return;
    setBusy(true);
    let resume: (() => Promise<void>) | undefined;
    let databaseClosed = false;
    try {
      resume = await services.actions.queue.suspend();
      await services.repository.close();
      databaseClosed = true;
      await services.photos.activateRestore();
      Alert.alert(copy.restoreDone);
      onReloadServices();
    } catch (cause) {
      await services.photos.discardRestore().catch(() => {});
      if (databaseClosed) {
        Alert.alert(
          copy.restoreFailed,
          copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED,
        );
        onReloadServices();
      } else {
        await resume?.();
        setMessage(copy.errors[errorCode(cause)] ?? copy.errors.PROCESSING_FAILED);
      }
    } finally {
      setBusy(false);
    }
  }

  const sheetHeight = Math.min(height - insets.top - 12, 540);
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight + 28, 0],
  });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle}>
            <SheetHandle />
          </View>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {copy.settings}
            </Text>
            <Button label={copy.close} onPress={close} disabled={busy} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.section}>{copy.exportSection}</Text>
            <Text style={styles.help}>{copy.exportMonthHelp}</Text>
            <View style={styles.option}>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{copy.signature}</Text>
                <Text style={styles.optionHelp}>{copy.signatureHelp}</Text>
              </View>
              <Switch
                accessibilityLabel={copy.signature}
                value={includeSignature}
                onValueChange={setIncludeSignature}
                trackColor={{ false: colors.line, true: colors.action }}
                thumbColor={colors.paper}
              />
            </View>
            <Button
              label={busy ? copy.processing : copy.shareMonth}
              onPress={exportMonth}
              disabled={busy}
            />
            <Text style={styles.section}>{copy.backupSection}</Text>
            <Text style={styles.help}>{copy.backupHelp}</Text>
            <Button
              primary
              label={busy ? copy.processing : copy.exportBackup}
              onPress={exportBackup}
              disabled={busy}
            />
            <Button
              label={busy ? copy.processing : copy.restoreBackup}
              onPress={prepareRestore}
              disabled={busy}
            />
            {!!message && (
              <Text accessibilityRole="alert" style={styles.help}>
                {message}
              </Text>
            )}
            <Text style={styles.privacy}>{copy.about}</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.ink },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: 'hidden',
  },
  handle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  header: {
    minHeight: 68,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.heading, fontSize: 25, lineHeight: 34 },
  content: { gap: 14, paddingHorizontal: 24, paddingTop: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 16, color: colors.ink },
  optionHelp: { fontSize: 13, lineHeight: 18, color: colors.muted },
  section: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 28 },
  help: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  privacy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
});
