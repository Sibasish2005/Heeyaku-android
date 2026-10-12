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
  // Base grid is 252 x 244, scaled to fit inside container
  const scale = (size * 0.72) / 252;
  const markWidth = 252 * scale;
  const markHeight = 244 * scale;
  const r = 22 * scale;
  const barHeight = 66 * scale;
  const containerRadius = 14 * (size / 64);

  const iconElement = (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          borderRadius: containerRadius,
          backgroundColor: showBackground ? '#0B1F33' : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}>
      <View
        style={{
          width: markWidth,
          height: markHeight,
          position: 'relative',
        }}>
        {/* Top Bar (longest): sharp top-left & bottom-right, rounded top-right & bottom-left */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: markWidth,
            height: barHeight,
            borderTopLeftRadius: 0,
            borderTopRightRadius: r,
            borderBottomRightRadius: 0,
            borderBottomLeftRadius: r,
            backgroundColor: '#FFFFFF',
          }}
        />

        {/* Middle Bar (medium, right-aligned): sharp top-left, top-right & bottom-right, rounded bottom-left */}
        <View
          style={{
            position: 'absolute',
            top: 89 * scale,
            right: 0,
            width: 162 * scale,
            height: barHeight,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderBottomLeftRadius: r,
            backgroundColor: '#FFFFFF',
          }}
        />

        {/* Bottom Bar (shortest, right-aligned): sharp top-left & top-right, rounded bottom-left & bottom-right */}
        <View
          style={{
            position: 'absolute',
            top: 178 * scale,
            right: 0,
            width: 92 * scale,
            height: barHeight,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomRightRadius: r,
            borderBottomLeftRadius: r,
            backgroundColor: '#FFFFFF',
          }}
        />

        {/* Electric Blue Dot: centered under top-bar overhang */}
        <View
          style={{
            position: 'absolute',
            left: (46.5 - 22) * scale,
            top: (176 - 22) * scale,
            width: 44 * scale,
            height: 44 * scale,
            borderRadius: 22 * scale,
            backgroundColor: '#2563EB',
          }}
        />
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

