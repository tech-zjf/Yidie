import { StyleSheet, View } from 'react-native';

export function SheetHandle() {
  return (
    <View style={styles.area} accessible={false}>
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  area: { height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: '#DADADA' },
});
