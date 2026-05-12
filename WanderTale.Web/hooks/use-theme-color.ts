import { ThemeTokens } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type StringTokenKey = { [K in keyof ThemeTokens]: ThemeTokens[K] extends string ? K : never }[keyof ThemeTokens]

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: StringTokenKey
): string {
  const { theme } = useTheme();
  const colorFromProps = props.light;

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return theme.tokens[colorName] as string;
  }
}
