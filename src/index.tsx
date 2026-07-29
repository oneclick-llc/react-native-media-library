import {
  type ColorValue,
  Image,
  type ImageRequireSource,
  processColor,
} from 'react-native';
import MediaLibrary from './NativeMediaLibrary';

type ImagesTypes = ImageRequireSource | string;

export interface FetchAssetsOptions {
  mediaType?: MediaType[];
  sortBy?: 'creationTime' | 'modificationTime';
  sortOrder?: 'asc' | 'desc';
  extensions?: string[];
  requestUrls?: boolean;
  limit?: number;
  offset?: number;
  onlyFavorites?: boolean;
  collectionId?: string;
  fromDate?: number;
  toDate?: number;
}

export interface FetchThumbnailOptions {
  url: string;
  assetId: string;
  time?: number;
  quality?: number;
}

export interface FetchVideoThumbnailsOptions {
  url: string;
  assetId: string;
  interval: number;
  maximumWidth: number;
  maximumHeight: number;
  iosPreferredTimescale: number;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
  timecodeMs: number;
}

interface SaveToLibrary {
  localUrl: string;
  album?: string;
}

export type MediaType = 'photo' | 'video' | 'audio' | 'unknown';
export type MediaSubType =
  | 'photoPanorama'
  | 'photoHDR'
  | 'photoScreenshot'
  | 'photoLive'
  | 'photoDepthEffect'
  | 'videoStreamed'
  | 'videoHighFrameRate'
  | 'videoTimelapse'
  | 'videoCinematic'
  | 'unknown';
export interface AssetItem {
  readonly filename: string;
  readonly id: string;
  readonly creationTime?: number;
  readonly modificationTime?: number;
  readonly mediaType: MediaType;
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  readonly uri: string;
  // only on IOS
  readonly subtypes?: MediaSubType[];
  // only on Android
  readonly contentUri?: string;
}

export interface DiskAssetItem {
  readonly isDirectory: boolean;
  readonly filename: string;
  readonly creationTime: number;
  readonly size: number;
  readonly uri: string;
}

export interface CollectionItem {
  readonly filename: string;
  readonly id: string;
  // On Android it will be approximate count
  readonly count: number;
}

export interface ImageResizeParams {
  uri: ImagesTypes;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png';
  resultSavePath: string;
}

export interface ImageCropParams {
  uri: ImagesTypes;
  x: number;
  y: number;
  width: number;
  height: number;
  format?: 'jpeg' | 'png';
  resultSavePath: string;
}

interface CombineImage {
  image: ImagesTypes;
  positions?: { x: number; y: number };
}

export interface FullAssetItem extends AssetItem {
  // on android, it will be available only from API 24 (N)
  readonly location?: { latitude: number; longitude: number };
  // on Android it is the path equal to URI, on iOS the URI is ph:// and this (URL) is file://
  readonly url?: string;
}

const prepareImages = (images: ImagesTypes[]): string[] => {
  return images.map((image) => {
    if (typeof image === 'string') return image;
    return Image.resolveAssetSource(image).uri;
  });
};

const prepareCombineImages = (
  images: CombineImage[]
): (Omit<CombineImage, 'image'> & { image: string })[] => {
  return images.map((image) => {
    if (typeof image.image === 'string') return { image: image.image };
    return {
      image: Image.resolveAssetSource(image.image).uri,
      positions: image.positions,
    };
  });
};
//
const prepareImage = (image: ImagesTypes): string => {
  if (typeof image === 'string') return image;
  return Image.resolveAssetSource(image).uri;
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; errorPayload?: unknown };

// Native modules invoke these callbacks synchronously from the bridge; a throw
// here cannot be caught by consumers and takes the app down as a fatal
// JavascriptException. Every response must therefore be parsed defensively.
const parseNativeResponse = <T,>(response: unknown): ParseResult<T> => {
  if (typeof response !== 'string') {
    return {
      ok: false,
      error: `unexpected non-string native response: ${JSON.stringify(response)}`,
    };
  }
  if (response.trim() === '') {
    return { ok: false, error: 'empty native response' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    return { ok: false, error: `malformed native response: ${response}` };
  }
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'error' in parsed
  ) {
    const errorPayload = (parsed as { error: unknown }).error;
    return { ok: false, error: String(errorPayload), errorPayload };
  }
  return { ok: true, value: parsed as T };
};

const resolveOptional =
  <T,>(resolve: (value: T | undefined) => void) =>
  (response: unknown) => {
    const result = parseNativeResponse<T>(response);
    resolve(result.ok ? result.value : undefined);
  };

const settleRequired =
  <T,>(
    method: string,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void
  ) =>
  (response: unknown) => {
    const result = parseNativeResponse<T>(response);
    if (result.ok) {
      resolve(result.value);
    } else {
      reject(new Error(`mediaLibrary.${method}: ${result.error}`));
    }
  };

export const mediaLibrary = {
  get cacheDir(): string {
    return MediaLibrary.cacheDir().replace(/\/$/, '');
  },

  getAssets(options?: FetchAssetsOptions): Promise<AssetItem[]> {
    const params = {
      mediaType: options?.mediaType ?? ['photo', 'video'],
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      limit: options?.limit,
      offset: options?.offset,
      onlyFavorites: options?.onlyFavorites ?? false,
      collectionId: options?.collectionId,
      fromDate: options?.fromDate,
      toDate: options?.toDate,
    };
    if (params.offset && !params.limit) {
      throw new Error(
        'limit parameter must be present in order to make a pagination'
      );
    }
    return new Promise<AssetItem[]>((resolve, reject) => {
      MediaLibrary.getAssets(params, (response) => {
        // Android answers the null-options early path with a real array
        if (Array.isArray(response)) return resolve(response as AssetItem[]);
        settleRequired<AssetItem[]>('getAssets', resolve, reject)(response);
      });
    });
  },
  getFromDisk(options: {
    path: string;
    extensions?: string[];
  }): Promise<DiskAssetItem[]> {
    return new Promise<DiskAssetItem[]>((resolve, reject) => {
      MediaLibrary.getFromDisk(
        {
          ...options,
          extensions: options.extensions
            ? options.extensions.join(',')
            : undefined,
        },
        settleRequired<DiskAssetItem[]>('getFromDisk', resolve, reject)
      );
    });
  },

  getCollections(): Promise<CollectionItem[]> {
    return new Promise<CollectionItem[]>((resolve, reject) => {
      MediaLibrary.getCollections(
        settleRequired<CollectionItem[]>('getCollections', resolve, reject)
      );
    });
  },

  getAsset(id: string): Promise<FullAssetItem | undefined> {
    return new Promise<FullAssetItem | undefined>((resolve) => {
      MediaLibrary.getAsset(id, resolveOptional<FullAssetItem>(resolve));
    });
  },

  exportVideo(params: {
    identifier: string;
    resultSavePath: string;
  }): Promise<FullAssetItem | undefined> {
    return new Promise<FullAssetItem | undefined>((resolve) => {
      MediaLibrary.exportVideo(params, resolveOptional<FullAssetItem>(resolve));
    });
  },

  saveToLibrary(params: SaveToLibrary) {
    return new Promise<AssetItem>((resolve, reject) => {
      MediaLibrary.saveToLibrary(params, (response) => {
        const result = parseNativeResponse<AssetItem>(response);
        if (result.ok) {
          resolve(result.value);
        } else if (result.errorPayload !== undefined) {
          // preserve the historical rejection value for {"error": ...} payloads
          reject(result.errorPayload);
        } else {
          reject(new Error(`mediaLibrary.saveToLibrary: ${result.error}`));
        }
      });
    });
  },

  fetchVideoFrame(params: FetchThumbnailOptions) {
    return new Promise<Thumbnail | undefined>((resolve) => {
      MediaLibrary.fetchVideoFrame(
        {
          time: params.time ?? 0,
          quality: params.quality ?? 1,
          url: params.url,
          assetId: params.assetId,
        },
        resolveOptional<Thumbnail>(resolve)
      );
    });
  },

  fetchVideoThumbnails(params: FetchVideoThumbnailsOptions) {
    return new Promise<Thumbnail[] | undefined>((resolve) => {
      MediaLibrary.fetchVideoThumbnails(
        {
          url: params.url,
          assetId: params.assetId,
          interval: params.interval,
          maximumWidth: params.maximumWidth,
          maximumHeight: params.maximumHeight,
          iosPreferredTimescale: params.iosPreferredTimescale,
        },
        resolveOptional<Thumbnail[]>(resolve)
      );
    });
  },

  combineImages(params: {
    readonly images: (CombineImage | ImagesTypes)[];
    readonly resultSavePath: string;
    readonly mainImageIndex?: number;
    readonly backgroundColor?: ColorValue | undefined;
  }) {
    return new Promise<{ result: boolean }>((resolve, reject) => {
      const images = params.images.map((img) =>
        typeof img === 'object' ? img : { image: img }
      );
      MediaLibrary.combineImages(
        {
          images: prepareCombineImages(images),
          resultSavePath: params.resultSavePath,
          mainImageIndex: params.mainImageIndex ?? 0,
          backgroundColor: (params.backgroundColor
            ? processColor(params.backgroundColor)
            : processColor('transparent')) as any,
        },
        settleRequired<{ result: boolean }>('combineImages', resolve, reject)
      );
    });
  },

  imageResize(params: ImageResizeParams) {
    return new Promise<{ result: boolean }>((resolve, reject) => {
      MediaLibrary.imageResize(
        {
          uri: prepareImage(params.uri),
          resultSavePath: params.resultSavePath,
          format: params.format ?? 'png',
          height: params.height ?? -1,
          width: params.width ?? -1,
        },
        settleRequired<{ result: boolean }>('imageResize', resolve, reject)
      );
    });
  },

  imageCrop(params: ImageCropParams) {
    return new Promise<{ result: boolean }>((resolve, reject) => {
      MediaLibrary.imageCrop(
        {
          ...params,
          uri: prepareImage(params.uri) as string,
          format: params.format ?? 'png',
        },
        settleRequired<{ result: boolean }>('imageCrop', resolve, reject)
      );
    });
  },

  imageSizes(params: { images: ImagesTypes[] }): Promise<
    {
      width: number;
      height: number;
      size: number;
    }[]
  > {
    return new Promise((resolve, reject) => {
      MediaLibrary.imageSizes(
        { images: prepareImages(params.images) },
        settleRequired<
          {
            width: number;
            height: number;
            size: number;
          }[]
        >('imageSizes', resolve, reject)
      );
    });
  },

  downloadAsBase64(params: {
    url: string;
  }): Promise<{ base64: string } | undefined> {
    return new Promise((resolve) => {
      MediaLibrary.downloadAsBase64(
        params,
        resolveOptional<{ base64: string }>(resolve)
      );
    });
  },
};
