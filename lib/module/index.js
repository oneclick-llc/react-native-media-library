"use strict";

import { Image, processColor } from 'react-native';
import MediaLibrary from "./NativeMediaLibrary.js";
const prepareImages = images => {
  return images.map(image => {
    if (typeof image === 'string') return image;
    return Image.resolveAssetSource(image).uri;
  });
};
const prepareCombineImages = images => {
  return images.map(image => {
    if (typeof image.image === 'string') return {
      image: image.image
    };
    return {
      image: Image.resolveAssetSource(image.image).uri,
      positions: image.positions
    };
  });
};
//
const prepareImage = image => {
  if (typeof image === 'string') return image;
  return Image.resolveAssetSource(image).uri;
};
export const mediaLibrary = {
  get cacheDir() {
    return MediaLibrary.cacheDir().replace(/\/$/, '');
  },
  getAssets(options) {
    const params = {
      mediaType: options?.mediaType ?? ['photo', 'video'],
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      limit: options?.limit,
      offset: options?.offset,
      onlyFavorites: options?.onlyFavorites ?? false,
      collectionId: options?.collectionId
    };
    if (params.offset && !params.limit) {
      throw new Error('limit parameter must be present in order to make a pagination');
    }
    return new Promise(resolve => {
      MediaLibrary.getAssets(params, response => resolve(JSON.parse(response)));
    });
  },
  getFromDisk(options) {
    return new Promise(resolve => {
      MediaLibrary.getFromDisk({
        ...options,
        extensions: options.extensions ? options.extensions.join(',') : undefined
      }, response => resolve(JSON.parse(response)));
    });
  },
  getCollections() {
    return new Promise(resolve => {
      MediaLibrary.getCollections(response => resolve(JSON.parse(response)));
    });
  },
  getAsset(id) {
    return new Promise(resolve => {
      MediaLibrary.getAsset(id, response => resolve(JSON.parse(response)));
    });
  },
  exportVideo(params) {
    return new Promise(resolve => {
      MediaLibrary.exportVideo(params, response => resolve(JSON.parse(response)));
    });
  },
  saveToLibrary(params) {
    return new Promise((resolve, reject) => {
      MediaLibrary.saveToLibrary(params, response => {
        const parsed = JSON.parse(response);
        if ('error' in parsed) {
          reject(parsed.error);
        } else {
          resolve(parsed);
        }
      });
    });
  },
  fetchVideoFrame(params) {
    return new Promise(resolve => {
      MediaLibrary.fetchVideoFrame({
        time: params.time ?? 0,
        quality: params.quality ?? 1,
        url: params.url
      }, response => resolve(JSON.parse(response)));
    });
  },
  combineImages(params) {
    return new Promise(resolve => {
      const images = params.images.map(img => typeof img === 'object' ? img : {
        image: img
      });
      MediaLibrary.combineImages({
        images: prepareCombineImages(images),
        resultSavePath: params.resultSavePath,
        mainImageIndex: params.mainImageIndex ?? 0,
        backgroundColor: params.backgroundColor ? processColor(params.backgroundColor) : processColor('transparent')
      }, response => resolve(JSON.parse(response)));
    });
  },
  imageResize(params) {
    return new Promise(resolve => {
      MediaLibrary.imageResize({
        uri: prepareImage(params.uri),
        resultSavePath: params.resultSavePath,
        format: params.format ?? 'png',
        height: params.height ?? -1,
        width: params.width ?? -1
      }, response => resolve(JSON.parse(response)));
    });
  },
  imageCrop(params) {
    return new Promise(resolve => {
      MediaLibrary.imageCrop({
        ...params,
        uri: prepareImage(params.uri),
        format: params.format ?? 'png'
      }, response => resolve(JSON.parse(response)));
    });
  },
  imageSizes(params) {
    return new Promise(resolve => {
      MediaLibrary.imageSizes({
        images: prepareImages(params.images)
      }, response => resolve(JSON.parse(response)));
    });
  },
  downloadAsBase64(params) {
    return new Promise(resolve => {
      MediaLibrary.downloadAsBase64(params, response => resolve(JSON.parse(response)));
    });
  }
};
//# sourceMappingURL=index.js.map