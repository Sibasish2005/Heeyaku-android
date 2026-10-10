import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HeeyakuLogoProps {
  size?: number;
  showBackground?: boolean;
  withText?: boolean;
  withTagline?: boolean;
  direction?: 'row' | 'column';
  textColor?: string;
  taglineColor?: string;
}

/**
 * Official HEEYAKU Brand Logo Component
 * Pixel-perfect alignment with the Web SVG Design System:
 * - Top bar: 64 x 13 (rx 4.5)
 * - Middle bar: 41 x 13 (rx 4.5, right-aligned)
 * - Bottom row: Blue Dot (#2563EB, r=5.5) + Short Bar 25 x 13 (rx 4.5)
 * - Optional Web Wordmark ("HEEYAKU") and Tagline ("A SUDDEN LEAP TO FUTURE")
 */
export const HeeyakuLogo: React.FC<HeeyakuLogoProps> = ({
  size = 48,
  showBackground = true,
  withText = false,
  withTagline = false,
  direction = 'row',
  textColor = '#FFFFFF',
  taglineColor = '#94A3B8',
}) => {
  // Base SVG grid is 64 x 54
  const scale = size / 64;
  const barHeight = 11.5 * scale;
  const barRadius = 4 * scale;
  const dotSize = 10 * scale;
  const iconHeight = 48 * scale;
  const containerRadius = 14 * scale;

  const iconElement = (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          borderRadius: containerRadius,
          backgroundColor: showBackground ? '#0B1F33' : 'transparent',
        },
      ]}>
      <View
        style={{
          width: 48 * scale,
          height: iconHeight,
          justifyContent: 'space-between',
        }}>
        {/* Top Bar (Full width: 64 in grid) */}
        <View
          style={{
            width: 48 * scale,
            height: barHeight,
            borderRadius: barRadius,
            backgroundColor: '#FFFFFF',
          }}
        />

        {/* Middle Bar (41 in 64 grid -> 64%) */}
        <View
          style={{
            width: 30.75 * scale,
            height: barHeight,
            borderRadius: barRadius,
            backgroundColor: '#FFFFFF',
            alignSelf: 'flex-end',
          }}
        />

        {/* Bottom Row: Dot + Short Bar (25 in 64 grid -> 39%) */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            height: barHeight,
          }}>
          {/* Electric Blue Dot */}
          <View
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: '#2563EB',
              marginLeft: 1.5 * scale,
            }}
          />

          {/* Short Bar */}
          <View
            style={{
              width: 18.75 * scale,
              height: barHeight,
              borderRadius: barRadius,
              backgroundColor: '#FFFFFF',
            }}
          />
        </View>
      </View>
    </View>
  );

  if (!withText) {
    return iconElement;
  }

  const isColumn = direction === 'column';

  return (
    <View
      style={[
        isColumn ? styles.lockupColumn : styles.lockupRow,
        { alignItems: 'center' },
      ]}>
      {iconElement}
      <View
        style={[
          isColumn ? styles.textColumn : styles.textRow,
          { alignItems: isColumn ? 'center' : 'flex-start' },
        ]}>
        <Text
          style={[
            styles.brandTitle,
            {
              color: textColor,
              fontSize: Math.max(16, Math.round(size * 0.42)),
            },
          ]}>
          HEEYAKU
        </Text>
        {withTagline && (
          <Text
            style={[
              styles.brandTagline,
              {
                color: taglineColor,
                fontSize: Math.max(8, Math.round(size * 0.2)),
              },
            ]}>
            A SUDDEN LEAP TO FUTURE
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lockupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockupColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  textRow: {
    justifyContent: 'center',
  },
  textColumn: {
    alignItems: 'center',
  },
  brandTitle: {
    fontWeight: '900',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
  },
  brandTagline: {
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 3,
  },
});

