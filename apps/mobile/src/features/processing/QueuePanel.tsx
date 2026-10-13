import { useSyncExternalStore } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { AppServices } from '../../services';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { colors } from '../../ui/tokens';
import { copy } from '../../ui/copy';

export function QueuePanel({ services }: { services: AppServices }) {
  const queue = services.actions.queue;
  const state = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  if (!state.queued && !state.running && !state.paused && !state.failed && !state.error)
    return null;
  const canPause = state.requested && (state.busy || state.queued > 0);
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        {state.busy && <ActivityIndicator color={colors.action} />}
        <Text style={{ flex: 1 }}>
          {copy.batch.queueCounts(state.queued + state.running, state.paused, state.failed)}
        </Text>
      </View>
      {!!state.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {copy.errors[state.error] ?? copy.errors.PROCESSING_FAILED}
        </Text>
      )}
      {state.requiresRestart && (
        <Text accessibilityRole="alert" style={styles.hint}>
          {copy.batch.restartHelp}
        </Text>
      )}
      {state.failed > 0 && <Text style={styles.hint}>{copy.batch.failedHelp}</Text>}
      <View style={styles.row}>
        {canPause && (
          <Button
            label={copy.batch.pause}
            onPress={() => {
              void queue.pause();
            }}
          />
        )}
        {!state.requested && (state.paused > 0 || state.queued > 0) && (
          <Button
            label={copy.batch.resume}
            disabled={state.requiresRestart}
            onPress={() => {
              void queue.resume();
            }}
          />
        )}
        {state.busy && !state.requested && <Text style={styles.hint}>{copy.batch.pausing}</Text>}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.wash,
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 12, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
});
