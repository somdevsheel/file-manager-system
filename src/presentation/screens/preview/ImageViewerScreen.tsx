import React, { useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { Appbar } from 'react-native-paper';
import FastImage from 'react-native-fast-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { ShareService } from '@services/ShareService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ImageViewerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ImageViewer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { path, siblingPaths } = route.params;

  const images = siblingPaths && siblingPaths.length > 0 ? siblingPaths : [path];
  const initialIndex = Math.max(0, images.indexOf(path));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  return (
    <View style={styles.container}>
      <Appbar.Header dark style={styles.appbar} elevated={false}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFFFFF" />
        <Appbar.Content title={images[currentIndex]?.split('/').pop() ?? ''} titleStyle={styles.title} />
        <Appbar.Action icon="share-variant-outline" color="#FFFFFF" onPress={() => ShareService.shareFiles([images[currentIndex]])} />
      </Appbar.Header>

      <FlatList
        data={images}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <FastImage
              source={{ uri: `file://${item}`, priority: FastImage.priority.high }}
              style={styles.image}
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
  page: { width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_WIDTH, height: '100%' },
});
