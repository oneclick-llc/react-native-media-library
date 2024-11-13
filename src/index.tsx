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
}

export interface FetchThumbnailOptions {
  url: string;
  time?: number;
  quality?: number;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
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
    };
    if (params.offset && !params.limit) {
      throw new Error(
        'limit parameter must be present in order to make a pagination'
      );
    }
    return new Promise<AssetItem[]>((resolve) => {
      MediaLibrary.getAssets(params, (response) =>
        resolve(JSON.parse(response))
      );
    });
  },
  getFromDisk(options: {
    path: string;
    extensions?: string[];
  }): Promise<DiskAssetItem[]> {
    return new Promise<DiskAssetItem[]>((resolve) => {
      MediaLibrary.getFromDisk(
        {
          ...options,
          extensions: options.extensions
            ? options.extensions.join(',')
            : undefined,
        },
        (response) => resolve(JSON.parse(response))
      );
    });
  },

  getCollections(): Promise<CollectionItem[]> {
    return new Promise<CollectionItem[]>((resolve) => {
      MediaLibrary.getCollections((response) => resolve(JSON.parse(response)));
    });
  },

  getAsset(id: string): Promise<FullAssetItem | undefined> {
    return new Promise<FullAssetItem | undefined>((resolve) => {
      MediaLibrary.getAsset(id, (response) => resolve(JSON.parse(response)));
    });
  },

  exportVideo(params: {
    identifier: string;
    resultSavePath: string;
  }): Promise<FullAssetItem | undefined> {
    return new Promise<FullAssetItem | undefined>((resolve) => {
      MediaLibrary.exportVideo(params, (response) =>
        resolve(JSON.parse(response))
      );
    });
  },

  saveToLibrary(params: SaveToLibrary) {
    return new Promise<AssetItem>((resolve, reject) => {
      MediaLibrary.saveToLibrary(params, (response) => {
        const parsed = JSON.parse(response);
        if ('error' in parsed) {
          reject(parsed.error);
        } else {
          resolve(parsed);
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
        },
        (response) => resolve(JSON.parse(response))
      );
    });
  },

  combineImages(params: {
    readonly images: (CombineImage | ImagesTypes)[];
    readonly resultSavePath: string;
    readonly mainImageIndex?: number;
    readonly backgroundColor?: ColorValue | undefined;
  }) {
    return new Promise<{ result: boolean }>((resolve) => {
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
        (response) => resolve(JSON.parse(response))
      );
    });
  },

  imageResize(params: ImageResizeParams) {
    return new Promise<{ result: boolean }>((resolve) => {
      MediaLibrary.imageResize(
        {
          uri: prepareImage(params.uri),
          resultSavePath: params.resultSavePath,
          format: params.format ?? 'png',
          height: params.height ?? -1,
          width: params.width ?? -1,
        },
        (response) => resolve(JSON.parse(response))
      );
    });
  },

  imageCrop(params: ImageCropParams) {
    return new Promise<{ result: boolean }>((resolve) => {
      MediaLibrary.imageCrop(
        {
          ...params,
          uri: prepareImage(params.uri) as string,
          format: params.format ?? 'png',
        },
        (response) => resolve(JSON.parse(response))
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
    return new Promise((resolve) => {
      MediaLibrary.imageSizes(
        { images: prepareImages(params.images) },
        (response) => resolve(JSON.parse(response))
      );
    });
  },

  downloadAsBase64(params: {
    url: string;
  }): Promise<{ base64: string } | undefined> {
    return new Promise((resolve) => {
      MediaLibrary.downloadAsBase64(params, (response) =>
        resolve(JSON.parse(response))
      );
    });
  },
};
