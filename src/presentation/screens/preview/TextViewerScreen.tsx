import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text, Button, ActivityIndicator } from 'react-native-paper';
import RNFS from 'react-native-fs';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { ShareService } from '@services/ShareService';
import { useAppTheme } from '@theme/ThemeProvider';

const MAX_PREVIEW_BYTES = 512 * 1024;

export function TextViewerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'TextViewer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { path } = route.params;
  const name = path.split('/').pop() ?? path;

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooLarge, setTooLarge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stat = await RNFS.stat(path);
        if (stat.size > MAX_PREVIEW_BYTES) {
          if (!cancelled) {
            setTooLarge(true);
            setLoading(false);
          }
          return;
        }
        const text = await RNFS.readFile(path, 'utf8');
        if (!cancelled) setContent(text);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to read file');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={name} />
        <Appbar.Action icon="share-variant-outline" onPress={() => ShareService.shareFiles([path])} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : tooLarge ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }}>
            This file is too large to preview in-app.
          </Text>
          <Button mode="contained" onPress={() => ShareService.openFile(path)}>
            Open with another app
          </Button>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text selectable style={[styles.mono, { color: theme.colors.onSurface }]}>
            {content}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  content: { padding: 16 },
  mono: { fontFamily: 'monospace', fontSize: 13, lineHeight: 19 },
});
