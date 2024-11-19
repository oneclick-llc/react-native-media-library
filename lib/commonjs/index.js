"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mediaLibrary = void 0;
var _reactNative = require("react-native");
var _NativeMediaLibrary = _interopRequireDefault(require("./NativeMediaLibrary.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const prepareImages = images => {
  return images.map(image => {
    if (typeof image === 'string') return image;
    return _reactNative.Image.resolveAssetSource(image).uri;
  });
};
const prepareCombineImages = images => {
  return images.map(image => {
    if (typeof image.image === 'string') return {
      image: image.image
    };
    return {
      image: _reactNative.Image.resolveAssetSource(image.image).uri,
      positions: image.positions
    };
  });
};
//
const prepareImage = image => {
  if (typeof image === 'string') return image;
  return _reactNative.Image.resolveAssetSource(image).uri;
};
const mediaLibrary = exports.mediaLibrary = {
  get cacheDir() {
    return _NativeMediaLibrary.default.cacheDir().replace(/\/$/, '');
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
      _NativeMediaLibrary.default.getAssets(params, response => resolve(JSON.parse(response)));
    });
  },
  getFromDisk(options) {
    return new Promise(resolve => {
      _NativeMediaLibrary.default.getFromDisk({
        ...options,
        extensions: options.extensions ? options.extensions.join(',') : undefined
      }, response => resolve(JSON.parse(response)));
    });
  },
  getCollections() {
    return new Promise(resolve => {
      _NativeMediaLibrary.default.getCollections(response => resolve(JSON.parse(response)));
    });
  },
  getAsset(id) {
    return new Promise(resolve => {
      _NativeMediaLibrary.default.getAsset(id, response => resolve(JSON.parse(response)));
    });
  },
  exportVideo(params) {
    return new Promise(resolve => {
      _NativeMediaLibrary.default.exportVideo(params, response => resolve(JSON.parse(response)));
    });
  },
  saveToLibrary(params) {
    return new Promise((resolve, reject) => {
      _NativeMediaLibrary.default.saveToLibrary(params, response => {
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
      _NativeMediaLibrary.default.fetchVideoFrame({
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
      _NativeMediaLibrary.default.combineImages({
        images: prepareCombineImages(images),
        resultSavePath: params.resultSavePath,
        mainImageIndex: params.mainImageIndex ?? 0,
        backgroundColor: params.backgroundColor ? (0, _reactNative.processColor)(params.backgroundColor) : (0, _reactNative.processColor)('transparent')
      }, response => resolve(JSON.parse(response)));
    });
  },
  imageResize(params) {
    return new Promise(resolve => {
      _NativeMediaLibrary.default.imageResize({
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
      _NativeMediaLibrary.default.imageCrop({
        ...params,
        uri: prepareImage(params.uri),
        format: params.format ?? 'png'
      }, response => resolve(JSON.parse(response)));
    });
  },
  imageSizes(params) {
    return new Promise(resolve => {
      _NativeMediaLibrary.default.imageSizes({
        images: prepareImages(params.images)
      }, response => resolve(JSON.parse(response)));
    });
  },
  downloadAsBase64(params) {
    return new Promise(resolve => {
      _NativeMediaLibrary.default.downloadAsBase64(params, response => resolve(JSON.parse(response)));
    });
  }
};
//# sourceMappingURL=index.js.map