import React, { useState } from 'react';
import { TouchableOpacity, StyleProp, TextStyle } from 'react-native';
import { Text } from './Text';
import type { TextVariant } from './Text';
import { useTheme } from '../../context/ThemeContext';

interface ExpandableTextProps {
  children: string;
  /** Collapse threshold in characters — clamping is char-based so web and native behave identically. */
  clampLength?: number;
  variant?: TextVariant;
  textStyle?: StyleProp<TextStyle>;
}

/** Slack below which clamping isn't worth a "Read more" tap. */
const CLAMP_SLACK = 120;

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  children,
  clampLength = 600,
  variant = 'body1',
  textStyle,
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const needsClamp = children.length > clampLength + CLAMP_SLACK;

  let display = children;
  if (needsClamp && !expanded) {
    const slice = children.slice(0, clampLength);
    const lastSpace = slice.lastIndexOf(' ');
    display = `${slice.slice(0, lastSpace > clampLength / 2 ? lastSpace : clampLength).trimEnd()}…`;
  }

  return (
    <>
      <Text variant={variant} style={textStyle}>
        {display}
      </Text>
      {needsClamp && (
        <TouchableOpacity
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        >
          <Text variant="label" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};
