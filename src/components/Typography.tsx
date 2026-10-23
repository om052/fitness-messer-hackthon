import React from 'react';
import { Text, TextProps } from 'react-native';
import { colors, typography } from '@/styles/theme';

interface TypographyProps extends TextProps {
  variant?: keyof typeof typography;
  color?: string;
  weight?: '400' | '500' | '600' | '700';
}

/**
 * Typography component for consistent text styling
 * Variants: h1, h2, h3, h4, body, bodySmall, caption
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = colors.text.primary,
  weight,
  style,
  children,
  ...props
}) => {
  const variantStyle = typography[variant];

  const textStyle = [
    variantStyle,
    {
      color,
      fontWeight: weight || variantStyle.fontWeight,
    },
    style,
  ];

  return (
    <Text style={textStyle} {...props}>
      {children}
    </Text>
  );
};

// Convenience exports for common typography variants
export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const BodySmall: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodySmall" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);
