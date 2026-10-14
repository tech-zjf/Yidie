import { StyleSheet, View } from 'react-native';
import { colors } from './tokens';

/** A tiny stack of dated paper cards with a cutout mark on the top sheet. */
export function BrandMark() {
  return (
    <View style={styles.mark} accessible={false}>
      <View style={[styles.sheet, styles.back]} />
      <View style={[styles.sheet, styles.middle]} />
      <View style={[styles.sheet, styles.front]}>
        <View style={styles.calendarRule} />
        <View style={styles.personHead} />
        <View style={styles.personBody} />
        <View style={styles.dateDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 32, height: 32, position: 'relative' },
  sheet: {
    position: 'absolute',
    width: 20,
    height: 25,
    borderRadius: 4,
    backgroundColor: colors.paper,
    borderWidth: 1.4,
  },
  back: {
    left: 1,
    top: 5,
    transform: [{ rotate: '-12deg' }],
    borderColor: '#9DCBD9',
  },
  middle: {
    left: 10,
    top: 2,
    transform: [{ rotate: '9deg' }],
    borderColor: '#A7A7A7',
  },
  front: { left: 6, top: 5, borderColor: colors.ink, overflow: 'hidden' },
  calendarRule: {
    position: 'absolute',
    top: 4,
    left: 3,
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.blue,
  },
  personHead: {
    position: 'absolute',
    top: 9,
    left: 8,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  personBody: {
    position: 'absolute',
    top: 14,
    left: 5,
    width: 11,
    height: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: colors.ink,
  },
  dateDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.blue,
  },
});
