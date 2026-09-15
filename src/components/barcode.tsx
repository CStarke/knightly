import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * Code 39 element patterns. Each character is nine elements, alternating
 * bar/space, starting with a bar: 'n' = narrow, 'w' = wide.
 */
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnnwn',
  '*': 'nwnnwnwnn',
};

/** Narrow elements are one unit, wide elements are two. */
type Element = { units: number; bar: boolean };

function encode(value: string): Element[] {
  const chars = `*${value.toUpperCase()}*`.split('');
  const elements: Element[] = [];

  chars.forEach((char, charIndex) => {
    const pattern = CODE39[char] ?? CODE39['-'];

    pattern.split('').forEach((element, index) => {
      elements.push({ units: element === 'w' ? 2 : 1, bar: index % 2 === 0 });
    });

    // Narrow space between characters.
    if (charIndex < chars.length - 1) {
      elements.push({ units: 1, bar: false });
    }
  });

  return elements;
}

type BarcodeProps = {
  value: string;
  height?: number;
  showValue?: boolean;
};

/**
 * A real Code 39 barcode drawn with views, so the prototype ships no image
 * assets. The bar width scales to whatever space the card gives it.
 */
export function Barcode({ value, height = 76, showValue = true }: BarcodeProps) {
  const [width, setWidth] = useState(0);
  const elements = encode(value);
  const totalUnits = elements.reduce((sum, element) => sum + element.units, 0);
  const unit = width > 0 ? Math.floor((width / totalUnits) * 10) / 10 : 0;

  return (
    <View style={styles.container}>
      <View
        style={[styles.bars, { height }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={`Barcode for card number ${value.split('').join(' ')}`}>
        {unit > 0
          ? elements.map((element, index) => (
              <View
                key={index}
                style={{
                  width: element.units * unit,
                  height: '100%',
                  backgroundColor: element.bar ? '#111111' : 'transparent',
                }}
              />
            ))
          : null}
      </View>

      {showValue ? (
        <ThemedText
          type="code"
          style={styles.value}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {value.split('').join(' ')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
  },
  value: {
    color: '#111111',
    letterSpacing: 1,
  },
});
