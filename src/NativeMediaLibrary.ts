import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getAssets(
    options: {
      mediaType?: string[];
      sortBy?: string;
      sortOrder?: string;
      extensions?: string[];
      requestUrls?: boolean;
      limit?: number;
      offset?: number;
      onlyFavorites?: boolean;
      collectionId?: string;
      fromDate?: number;
      toDate?: number;
    },
    callback: (items: string) => void
  ): void;

  getFromDisk(
    options: { path: string; extensions?: string },
    callback: (items: string) => void
  ): void;

  getCollections(callback: (items: string) => void): void;
  getAsset(id: string, callback: (items: string) => void): void;

  exportVideo(
    params: {
      identifier: string;
      resultSavePath: string;
    },
    callback: (items: string) => void
  ): void;

  saveToLibrary(
    params: { localUrl: string; album?: string },
    callback: (items: string) => void
  ): void;

  fetchVideoFrame(
    params: { url: string; time: number; quality: number; assetId: string },
    callback: (items: string) => void
  ): void;

  combineImages(
    params: {
      images: { image: string; positions?: { x: number; y: number } }[];
      resultSavePath: string;
      mainImageIndex: number;
      backgroundColor: number;
    },
    callback: (items: string) => void
  ): void;

  imageResize(
    params: {
      uri: string;
      width: number;
      height: number;
      format: string;
      resultSavePath: string;
    },
    callback: (items: string) => void
  ): void;

  imageCrop(
    params: {
      uri: string;
      x: number;
      y: number;
      width: number;
      height: number;
      format: string;
      resultSavePath: string;
    },
    callback: (items: string) => void
  ): void;

  imageSizes(
    params: { images: string[] },
    callback: (items: string) => void
  ): void;

  downloadAsBase64(
    params: { url: string },
    callback: (items: string) => void
  ): void;

  cacheDir(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MediaLibrary');
