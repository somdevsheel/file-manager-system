import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import Video from 'react-native-video';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';

export function VideoPlayerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoPlayer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { path } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: `file://${path}` }}
        style={styles.video}
        resizeMode="contain"
        controls
        paused={false}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      )}
      <IconButton
        icon="arrow-left"
        iconColor="#FFFFFF"
        size={24}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  video: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 8, left: 4, backgroundColor: 'rgba(0,0,0,0.4)' },
});
