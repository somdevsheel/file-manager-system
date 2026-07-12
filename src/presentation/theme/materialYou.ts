import { NativeModules } from 'react-native';
import { md3DarkColors, md3LightColors } from '@theme/colors';

type TonalFamily = Record<string, string>; // step ("0".."1000") -> hex
export interface DynamicPalette {
  accent1: TonalFamily;
  accent2: TonalFamily;
  accent3: TonalFamily;
  neutral1: TonalFamily;
  neutral2: TonalFamily;
}

const ThemeInfo = NativeModules.ThemeInfo as
  | { isDynamicColorAvailable(): Promise<boolean>; getDynamicColorPalette(): Promise<DynamicPalette | null> }
  | undefined;

export async function isDynamicColorAvailable(): Promise<boolean> {
  if (!ThemeInfo) return false;
  try {
    return await ThemeInfo.isDynamicColorAvailable();
  } catch {
    return false;
  }
}

export async function fetchDynamicPalette(): Promise<DynamicPalette | null> {
  if (!ThemeInfo) return null;
  try {
    return await ThemeInfo.getDynamicColorPalette();
  } catch {
    return null;
  }
}

/**
 * Maps Android's raw tonal steps onto MD3 color roles, following the same role<->tone
 * assignment Android's own DynamicColors implementation uses internally.
 */
export function buildDynamicColors(palette: DynamicPalette, dark: boolean) {
  const a1 = palette.accent1;
  const a2 = palette.accent2;
  const a3 = palette.accent3;
  const n1 = palette.neutral1;
  const n2 = palette.neutral2;
  const t = (family: TonalFamily, step: number, fallback: string) => family?.[String(step)] ?? fallback;

  if (dark) {
    return {
      ...md3DarkColors,
      primary: t(a1, 200, md3DarkColors.primary),
      onPrimary: t(a1, 800, md3DarkColors.onPrimary),
      primaryContainer: t(a1, 700, md3DarkColors.primaryContainer),
      onPrimaryContainer: t(a1, 100, md3DarkColors.onPrimaryContainer),
      secondary: t(a2, 200, md3DarkColors.secondary),
      onSecondary: t(a2, 800, md3DarkColors.onSecondary),
      secondaryContainer: t(a2, 700, md3DarkColors.secondaryContainer),
      onSecondaryContainer: t(a2, 100, md3DarkColors.onSecondaryContainer),
      tertiary: t(a3, 200, md3DarkColors.tertiary),
      onTertiary: t(a3, 800, md3DarkColors.onTertiary),
      tertiaryContainer: t(a3, 700, md3DarkColors.tertiaryContainer),
      onTertiaryContainer: t(a3, 100, md3DarkColors.onTertiaryContainer),
      background: t(n1, 900, md3DarkColors.background),
      onBackground: t(n1, 100, md3DarkColors.onBackground),
      surface: t(n1, 900, md3DarkColors.surface),
      onSurface: t(n1, 100, md3DarkColors.onSurface),
      surfaceVariant: t(n2, 700, md3DarkColors.surfaceVariant),
      onSurfaceVariant: t(n2, 200, md3DarkColors.onSurfaceVariant),
      outline: t(n2, 500, md3DarkColors.outline),
    };
  }
  return {
    ...md3LightColors,
    primary: t(a1, 600, md3LightColors.primary),
    onPrimary: t(a1, 0, md3LightColors.onPrimary),
    primaryContainer: t(a1, 100, md3LightColors.primaryContainer),
    onPrimaryContainer: t(a1, 900, md3LightColors.onPrimaryContainer),
    secondary: t(a2, 600, md3LightColors.secondary),
    onSecondary: t(a2, 0, md3LightColors.onSecondary),
    secondaryContainer: t(a2, 100, md3LightColors.secondaryContainer),
    onSecondaryContainer: t(a2, 900, md3LightColors.onSecondaryContainer),
    tertiary: t(a3, 600, md3LightColors.tertiary),
    onTertiary: t(a3, 0, md3LightColors.onTertiary),
    tertiaryContainer: t(a3, 100, md3LightColors.tertiaryContainer),
    onTertiaryContainer: t(a3, 900, md3LightColors.onTertiaryContainer),
    background: t(n1, 10, md3LightColors.background),
    onBackground: t(n1, 900, md3LightColors.onBackground),
    surface: t(n1, 10, md3LightColors.surface),
    onSurface: t(n1, 900, md3LightColors.onSurface),
    surfaceVariant: t(n2, 100, md3LightColors.surfaceVariant),
    onSurfaceVariant: t(n2, 700, md3LightColors.onSurfaceVariant),
    outline: t(n2, 500, md3LightColors.outline),
  };
}
