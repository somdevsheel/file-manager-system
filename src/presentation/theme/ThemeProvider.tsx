import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, MD3Theme } from 'react-native-paper';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme, Theme as NavTheme } from '@react-navigation/native';
import { md3DarkColors, md3LightColors, categoryAccentColors } from '@theme/colors';
import { buildDynamicColors, fetchDynamicPalette, DynamicPalette } from '@theme/materialYou';
import { spacing, radius, elevationShadow } from '@theme/tokens';
import { useSettingsStore } from '@store/settingsStore';

export interface AppTheme extends MD3Theme {
  custom: {
    spacing: typeof spacing;
    radius: typeof radius;
    shadow: typeof elevationShadow;
    categoryAccentColors: typeof categoryAccentColors;
  };
}

const AppThemeContext = createContext<{ theme: AppTheme; isDark: boolean } | null>(null);

function buildAppTheme(colors: typeof md3LightColors, dark: boolean): AppTheme {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    dark,
    colors: { ...base.colors, ...colors },
    custom: { spacing, radius, shadow: elevationShadow, categoryAccentColors },
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const useMaterialYou = useSettingsStore((s) => s.useMaterialYou);
  const [dynamicPalette, setDynamicPalette] = useState<DynamicPalette | null>(null);

  useEffect(() => {
    if (!useMaterialYou) {
      setDynamicPalette(null);
      return;
    }
    let cancelled = false;
    fetchDynamicPalette().then((palette) => {
      if (!cancelled) setDynamicPalette(palette);
    });
    return () => {
      cancelled = true;
    };
  }, [useMaterialYou]);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const theme = useMemo(() => {
    if (useMaterialYou && dynamicPalette) {
      return buildAppTheme(buildDynamicColors(dynamicPalette, isDark) as typeof md3LightColors, isDark);
    }
    return buildAppTheme(isDark ? md3DarkColors : md3LightColors, isDark);
  }, [useMaterialYou, dynamicPalette, isDark]);

  const navTheme: NavTheme = useMemo(() => {
    const base = isDark ? NavDarkTheme : NavLightTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.elevation.level2,
        text: theme.colors.onBackground,
        border: theme.colors.outlineVariant,
        notification: theme.colors.error,
      },
    };
  }, [isDark, theme]);

  return (
    <AppThemeContext.Provider value={{ theme, isDark }}>
      <PaperProvider theme={theme}>
        <NavThemeContext.Provider value={navTheme}>{children}</NavThemeContext.Provider>
      </PaperProvider>
    </AppThemeContext.Provider>
  );
}

const NavThemeContext = createContext<NavTheme>(NavLightTheme);
export function useNavTheme() {
  return useContext(NavThemeContext);
}

export function useAppTheme(): AppTheme {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useIsDarkTheme(): boolean {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useIsDarkTheme must be used within ThemeProvider');
  return ctx.isDark;
}
