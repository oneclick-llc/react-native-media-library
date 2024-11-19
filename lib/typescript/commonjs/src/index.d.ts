import { type ColorValue, type ImageRequireSource } from 'react-native';
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
export type MediaSubType = 'photoPanorama' | 'photoHDR' | 'photoScreenshot' | 'photoLive' | 'photoDepthEffect' | 'videoStreamed' | 'videoHighFrameRate' | 'videoTimelapse' | 'videoCinematic' | 'unknown';
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
    positions?: {
        x: number;
        y: number;
    };
}
export interface FullAssetItem extends AssetItem {
    readonly location?: {
        latitude: number;
        longitude: number;
    };
}
export declare const mediaLibrary: {
    readonly cacheDir: string;
    getAssets(options?: FetchAssetsOptions): Promise<AssetItem[]>;
    getFromDisk(options: {
        path: string;
        extensions?: string[];
    }): Promise<DiskAssetItem[]>;
    getCollections(): Promise<CollectionItem[]>;
    getAsset(id: string): Promise<FullAssetItem | undefined>;
    exportVideo(params: {
        identifier: string;
        resultSavePath: string;
    }): Promise<FullAssetItem | undefined>;
    saveToLibrary(params: SaveToLibrary): Promise<AssetItem>;
    fetchVideoFrame(params: FetchThumbnailOptions): Promise<Thumbnail | undefined>;
    combineImages(params: {
        readonly images: (CombineImage | ImagesTypes)[];
        readonly resultSavePath: string;
        readonly mainImageIndex?: number;
        readonly backgroundColor?: ColorValue | undefined;
    }): Promise<{
        result: boolean;
    }>;
    imageResize(params: ImageResizeParams): Promise<{
        result: boolean;
    }>;
    imageCrop(params: ImageCropParams): Promise<{
        result: boolean;
    }>;
    imageSizes(params: {
        images: ImagesTypes[];
    }): Promise<{
        width: number;
        height: number;
        size: number;
    }[]>;
    downloadAsBase64(params: {
        url: string;
    }): Promise<{
        base64: string;
    } | undefined>;
};
export {};
//# sourceMappingURL=index.d.ts.map