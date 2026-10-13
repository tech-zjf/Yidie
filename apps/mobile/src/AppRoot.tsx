import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getServices, type AppServices } from './services';
import { CalendarScreen } from './features/calendar/CalendarScreen';
import { Text } from './ui/Text';
import { copy } from './ui/copy';
import { colors } from './ui/tokens';

export function AppRoot() {
  const [services, setServices] = useState<AppServices | null>(null),
    [error, setError] = useState('');
  const [fontsReady, fontError] = useFonts({
    YidieDisplay: require('../assets/fonts/YidieDisplay.ttf'),
    YidieDisplayItalic: require('../assets/fonts/YidieDisplayItalic.ttf'),
  });
  useEffect(() => {
    let active = true;
    void getServices()
      .then((value) => {
        if (active) setServices(value);
      })
      .catch((e) => {
        if (active)
          setError(
            e.message === 'NATIVE_MODULE_MISSING'
              ? copy.nativeMissing
              : copy.errors.PROCESSING_FAILED,
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {services && fontsReady ? (
        <CalendarScreen services={services} />
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 32,
            gap: 16,
            backgroundColor: colors.paper,
          }}
        >
          {!error && !fontError && <ActivityIndicator color={colors.action} />}
          <Text>{error || (fontError ? copy.errors.PROCESSING_FAILED : copy.loading)}</Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}
