import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Appbar } from 'react-native-paper';
import FastImage from 'react-native-fast-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { ShareService } from '@services/ShareService';
import { notifyError } from '@utils/notify';

export function ImageViewerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ImageViewer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { path, siblingPaths } = route.params;
  // Read reactively rather than once at module load (Dimensions.get), so paging and image size
  // stay correct after the device rotates.
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);

  const images = siblingPaths && siblingPaths.length > 0 ? siblingPaths : [path];
  const initialIndex = Math.max(0, images.indexOf(path));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Keep the same image on screen when the page width changes on rotation.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: currentIndex * screenWidth, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenWidth]);

  return (
    <View style={styles.container}>
      <Appbar.Header dark style={styles.appbar} elevated={false}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFFFFF" />
        <Appbar.Content
          title={images[currentIndex]?.split('/').pop() ?? ''}
          subtitle={images.length > 1 ? `${currentIndex + 1} / ${images.length}` : undefined}
          titleStyle={styles.title}
          subtitleStyle={styles.subtitle}
        />
        <Appbar.Action
          icon="share-variant-outline"
          color="#FFFFFF"
          onPress={() => ShareService.shareFiles([images[currentIndex]]).catch((e) => notifyError(e, "Couldn't share"))}
        />
      </Appbar.Header>

      <FlatList
        ref={listRef}
        data={images}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setCurrentIndex(
            Math.min(images.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / screenWidth))),
          )
        }
        windowSize={3}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: screenWidth }]}>
            <FastImage
              source={{ uri: `file://${item}`, priority: FastImage.priority.high }}
              style={[styles.image, { width: screenWidth }]}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  appbar: { backgroundColor: 'rgba(0,0,0,0.6)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  title: { color: '#FFFFFF', fontSize: 14 },
  subtitle: { color: 'rgba(255,255,255,0.7)' },
  page: { alignItems: 'center', justifyContent: 'center' },
  image: { height: '100%' },
});
