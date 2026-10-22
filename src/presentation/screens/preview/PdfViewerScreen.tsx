import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Text, ActivityIndicator, Button } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { ShareService } from '@services/ShareService';
import { useAppTheme } from '@theme/ThemeProvider';
import { notifyError } from '@utils/notify';

export function PdfViewerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PdfViewer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { path } = route.params;
  const name = path.split('/').pop() ?? path;

  const [pageInfo, setPageInfo] = useState<{ page: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={name} subtitle={pageInfo ? `${pageInfo.page} / ${pageInfo.total}` : undefined} />
        <Appbar.Action icon="share-variant-outline" onPress={() => ShareService.shareFiles([path]).catch((e) => notifyError(e, "Couldn't share"))} />
      </Appbar.Header>

      {error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>Couldn't open this PDF.</Text>
          <Button
            mode="contained"
            onPress={() => ShareService.openFile(path).catch((e) => notifyError(e, 'No app found to open this file'))}
          >
            Open with another app
          </Button>
        </View>
      ) : (
        <Pdf
          source={{ uri: `file://${path}` }}
          style={styles.pdf}
          onLoadComplete={(numberOfPages) => setPageInfo({ page: 1, total: numberOfPages })}
          onPageChanged={(page, numberOfPages) => setPageInfo({ page, total: numberOfPages })}
          onError={() => setError('load-failed')}
          renderActivityIndicator={() => <ActivityIndicator color={theme.colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pdf: { flex: 1, width: '100%' },
});
