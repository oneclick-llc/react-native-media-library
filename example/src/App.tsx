import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mediaLibrary } from 'react-native-media-library';

export default function App() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={async () => {
          const response = await mediaLibrary.getAssets();
          console.log('🍓[App.response]', response);
        }}
      >
        <Text>Press</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const response = mediaLibrary.cacheDir;
          console.log('🍓[App.response]', response);
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
          console.log('🍓[App.response]', response);
        }}
      >
        <Text>get from disk</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          const response = await mediaLibrary.getCollections();
          console.log('🍓[App.response]', response);
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
            console.log('🍓[App.response]', response);
          }
        }}
      >
        <Text>getAsset</Text>
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
