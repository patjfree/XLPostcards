import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // Always use white background unless overridden by style prop
  const backgroundColor = lightColor || '#FFFFFF';

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
