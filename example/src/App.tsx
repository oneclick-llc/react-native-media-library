import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mediaLibrary } from 'react-native-media-library';

export default function App() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={async () => {
          const response = await mediaLibrary.getAssets();
          console.log('🍓[App.re]', response);
        }}
      >
        <Text>Press</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const response = mediaLibrary.cacheDir;
          console.log('🍓[App.re]', response);
        }}
      >
        <Text>Cache</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          const response = await mediaLibrary.getFromDisk({
            extensions: [],
            path: `${mediaLibrary.cacheDir}`,
          });
          console.log('🍓[App.re]', response);
        }}
      >
        <Text>get from disk</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          const response = await mediaLibrary.getCollections();
          console.log('🍓[App.re]', response);
        }}
      >
        <Text>getCollections</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const assets = await mediaLibrary.getAssets();
          console.log('🍓[App.assets]', assets);
          if (assets.length > 0) {
            const response = await mediaLibrary.getAsset(assets[0]!.id);
            console.log('🍓[App.re]', response);
          }
        }}
      >
        <Text>getAsset</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const assets = await mediaLibrary.getAssets({
            mediaType: ['video'],
            // sortBy?: 'creationTime' | 'modificationTime';
            // sortOrder?: 'asc' | 'desc';
            // extensions?: string[];
            // requestUrls?: boolean;
            // limit?: number;
            // offset?: number;
            // onlyFavorites?: boolean;
            // collectionId?: string;
            // fromDate?: number;
            // toDate?: number;
          });
          console.log('🍓[App.assets]', assets);
          const videoAsset = assets.find(
            (asset) => asset.mediaType === 'video'
          );
          if (!videoAsset) return;
          const videoFrame = await mediaLibrary.fetchVideoFrame({
            url: videoAsset.uri,
            assetId: videoAsset.id,
            // time?: number;
            // quality?: number;
          });
          console.log('🍓[App.videoFrame]', videoFrame);
        }}
      >
        <Text>getAsset+fetchVideoFrame</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const assets = await mediaLibrary.getAssets({
            mediaType: ['video'],
            // sortBy?: 'creationTime' | 'modificationTime';
            // sortOrder?: 'asc' | 'desc';
            // extensions?: string[];
            // requestUrls?: boolean;
            // limit?: number;
            // offset?: number;
            // onlyFavorites?: boolean;
            // collectionId?: string;
            // fromDate?: number;
            // toDate?: number;
          });
          console.log('🍓[App.assets]', assets);
          const videoAsset = assets.find(
            (asset) => asset.mediaType === 'video'
          );
          if (!videoAsset) return;
          console.log('🍓[App.videoAsset]', videoAsset);
          const thumbnails = await mediaLibrary.fetchVideoThumbnails({
            url: videoAsset.uri,
            assetId: videoAsset.id,
            interval: 1,
            maximumWidth: 320,
            maximumHeight: 320,
            iosPreferredTimescale: 600,
          });
          console.log('🍓[fetchVideoThumbnails] result', thumbnails);
        }}
      >
        <Text>getAsset+fetchVideoThumbnails</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
