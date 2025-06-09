#import "MediaLibrary.h"
#import "FetchVideoFrame.h"
#import "RCTConvert.h"
#import "MediaAssetFileNative.h"
#import "react_native_media_library-Swift.h"


@interface MediaLibrary()
{
    
}
@end

@interface MediaLibraryFileEntry : NSObject
@property (nonatomic, strong, nonnull) NSString *name;
@property (nonatomic, strong, nonnull) NSString *absolutePath;
@property (nonatomic, assign) BOOL isDirectory;
@property (nonatomic, assign) UInt64 size;
@property (nonatomic, strong, nullable) NSDate *modificationDate;
- (NSMutableDictionary *)toNSDictionary;
@end

@implementation MediaLibraryFileEntry
- (NSMutableDictionary *)toNSDictionary
{
    
    NSMutableDictionary *dictionary = [[NSMutableDictionary alloc] init];
    [dictionary setValue:self.name forKey:@"filename"];
    [dictionary setValue:self.absolutePath forKey:@"uri"];
    [dictionary setValue:@(self.isDirectory) forKey:@"isDirectory"];
    [dictionary setValue:@(self.size) forKey:@"size"];
    [dictionary setValue:@([self.modificationDate timeIntervalSince1970] * 1000.0) forKey:@"modificationTime"];
    
    return dictionary;
}
@end

@implementation MediaLibrary
RCT_EXPORT_MODULE()

NSString *const RESULT_FALSE = @"{\"result\": false}";
NSString *const RESULT_TRUE = @"{\"result\": true}";

+(NSString *)JSONString:(NSString *)aString {
    NSMutableString *s = [NSMutableString stringWithString:aString];
    [s replaceOccurrencesOfString:@"\\" withString:@"\\\\" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    [s replaceOccurrencesOfString:@"\"" withString:@"\\\"" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    [s replaceOccurrencesOfString:@"/" withString:@"\\/" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    [s replaceOccurrencesOfString:@"\n" withString:@"\\n" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    [s replaceOccurrencesOfString:@"\b" withString:@"\\b" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    [s replaceOccurrencesOfString:@"\f" withString:@"\\f" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    [s replaceOccurrencesOfString:@"\r" withString:@"\\r" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    [s replaceOccurrencesOfString:@"\t" withString:@"\\t" options:NSCaseInsensitiveSearch range:NSMakeRange(0, [s length])];
    return [NSString stringWithString:s];
}

-(MediaLibraryFileEntry *) createFrom:(MediaAssetFileNative::File)file {
    MediaLibraryFileEntry *entry = [[MediaLibraryFileEntry alloc] init];
    entry.name = @(file.name.c_str());
    entry.absolutePath = @(file.absolutePath.c_str());
    entry.isDirectory = file.isDir;
    entry.size = file.size;
    
    entry.modificationDate = [NSDate dateWithTimeIntervalSince1970:file.lastModificationTime / 1000];
    return entry;
};

dispatch_queue_t defQueue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeMediaLibrarySpecJSI>(params);
}

// MARK: getAssets
- (void)getAssets:(JS::NativeMediaLibrary::SpecGetAssetsOptions &)options callback:(RCTResponseSenderBlock)callback {
    
    int limit = options.limit().value_or(-1);
    int offset = options.offset().value_or(-1);
    NSString *sortBy = options.sortBy();
    NSString *sortOrder = options.sortOrder();
    NSString *collectionId = options.collectionId();
    long fromDate = options.fromDate().value_or(-1);
    long toDate = options.toDate().value_or(-1);
    NSNumber *fromDateNum = nil;
    if (fromDate >= 0) {
        fromDateNum = [NSNumber numberWithLong: fromDate];
    }
    NSNumber *toDateNum = nil;
    if (toDate >= 0) {
        toDateNum = [NSNumber numberWithLong: toDate];
    }
    
    std::optional<facebook::react::LazyVector<NSString *>> mediaTypeOpt = options.mediaType();
    NSArray<NSString *> *mediaTypes = @[];
    if (mediaTypeOpt.has_value()) {
        const facebook::react::LazyVector<NSString *> &vec = mediaTypeOpt.value();
        NSMutableArray<NSString *> *mutableArray = [NSMutableArray arrayWithCapacity:vec.size()];
        for (size_t i = 0; i < vec.size(); ++i) {
            NSString *str = vec.at(i); // LazyVector returns NSString* directly in this case
            if (str) {
                [mutableArray addObject:str];
            }
        }
        mediaTypes = [mutableArray copy];
    }
    
    [MediaAssetManager fetchAssetsWithLimit:limit
                                     offset:offset
                                     sortBy:sortBy
                                  sortOrder:sortOrder
                                  mediaType:mediaTypes
                               collectionId:collectionId
                                   fromDate:fromDateNum
                                     toDate:toDateNum
                                 completion:^(NSString * _Nonnull json) {
        
        callback(@[json]);
    }];
    
    auto rawMediaTypes = options.mediaType();
}

// MARK: getCollections
- (void)getCollections:(RCTResponseSenderBlock)callback {
    [MediaAssetManager fetchCollectionsWithCompletion:^(NSString * _Nonnull json) {
        callback(@[json]);
    }];
}

// MARK: getAsset
- (void)getAsset:(NSString *)id callback:(RCTResponseSenderBlock)callback {
    [MediaAssetManager fetchAssetWithIdentifier:id completion:^(NSString * _Nullable json) {
        callback(@[json]);
    }];
}

// MARK: exportVideo
- (void)exportVideo:(JS::NativeMediaLibrary::SpecExportVideoParams &)params callback:(RCTResponseSenderBlock)callback {
    auto identifier = params.identifier();
    auto resultPath = params.resultSavePath();
    
    [MediaAssetManager exportVideoWithIdentifier:identifier resultSavePath:resultPath completion:^(BOOL success) {
        auto result = success ? RESULT_TRUE : RESULT_FALSE;
        callback(@[result]);
    }];
}

// MARK: saveToLibrary
- (void)saveToLibrary:(JS::NativeMediaLibrary::SpecSaveToLibraryParams &)params callback:(RCTResponseSenderBlock)callback {
    auto localUri = params.localUrl();
    auto album = params.album();
    
    [LibrarySaveToCameraRoll saveToCameraRollWithLocalUri:localUri
                                                    album:album
                                                 callback:^(NSString * _Nullable error, NSString * _Nullable json) {
        
        if (error) {
            NSDictionary *responseDictionary = @{@"error": [MediaLibrary JSONString:error]};
            NSData *data = [NSJSONSerialization dataWithJSONObject:responseDictionary options:kNilOptions error:nil];
            NSString *jsonStr = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            callback(@[jsonStr]);
        } else {
            callback(@[json]);
        }
    }];
}

// MARK: fetchVideoFrame
- (void)fetchVideoFrame:(JS::NativeMediaLibrary::SpecFetchVideoFrameParams &)params callback:(RCTResponseSenderBlock)callback {
    auto assetId = params.assetId();
    auto url = params.url();
    double time = params.time();
    double quality = params.quality();
    
    dispatch_async(defQueue, ^{
        auto resultString = [FetchVideoFrame fetchVideoFrame:url time:time quality:quality];
        if (resultString != nil) {
            callback(@[resultString]);
        } else {
            auto secondTryResult = [FetchVideoFrame fetchVideoFrameById:assetId time:time quality:quality];
            if (secondTryResult != nil) {
                callback(@[secondTryResult]);
            } else {
                NSDictionary *responseDictionary = @{@"error": @"Error fetching video frame. None of the native methods returned valid result."};
                NSData *data = [NSJSONSerialization dataWithJSONObject:responseDictionary options:kNilOptions error:nil];
                NSString *jsonStr = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                callback(@[jsonStr]);
            }
        }
    });
}

// MARK: fetchVideoThumbnails
- (void)fetchVideoThumbnails:(JS::NativeMediaLibrary::SpecFetchVideoThumbnailsParams &)params callback:(RCTResponseSenderBlock)callback {
    /*
     url: string;
     assetId: string;
     interval: number;
     maximumWidth: number;
     maximumHeight: number;
     iosPreferredTimescale: number;
     */
    auto url = params.url();
    auto assetId = params.assetId();
    double interval = params.interval();
    double maximumWidth = params.maximumWidth();
    double maximumHeight = params.maximumHeight();
    double iosPreferredTimescale = params.iosPreferredTimescale();
    
    dispatch_async(defQueue, ^{
        [LibraryFetchVideoThumbnails fetchVideoThumbnailsWithUrl:url assetId:assetId interval:interval maximumWidth:maximumWidth maximumHeight:maximumHeight iosPreferredTimescale:iosPreferredTimescale completion:^(NSString * _Nullable resultString, NSError * _Nullable error) {
            if (resultString != nil) {
                callback(@[resultString]);
            } else if (error != nil) {
                NSString *errorString = [NSString stringWithFormat:@"Domain: %@, Code: %ld, Description: %@",
                                         error.domain,
                                         (long)error.code,
                                         error.localizedDescription];
                NSDictionary *responseDictionary = @{@"error": errorString};
                NSData *data = [NSJSONSerialization dataWithJSONObject:responseDictionary
                                                               options:kNilOptions error:nil];
                NSString *jsonStr = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                callback(@[jsonStr]);
            } else {
                NSDictionary *responseDictionary = @{@"error": @"Error fetching video thumbnails. Error unknown."};
                NSData *data = [NSJSONSerialization dataWithJSONObject:responseDictionary
                                                               options:kNilOptions error:nil];
                NSString *jsonStr = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                callback(@[jsonStr]);
            }
        }];
    });
}



// MARK: getFromDisk
- (void)getFromDisk:(JS::NativeMediaLibrary::SpecGetFromDiskOptions &)options callback:(RCTResponseSenderBlock)callback {
    auto path = options.path();
    auto extensions = options.extensions();
    auto rawSortBy = "modificationTime_desc";
    
    
    dispatch_async(defQueue, ^{
        MediaAssetFileNative::fileVector_t files;
        auto rPath = [path cStringUsingEncoding:NSUTF8StringEncoding];
        MediaAssetFileNative::getFilesList(rPath, rawSortBy, &files);
        
        NSMutableArray<NSMutableDictionary *> *entries = [NSMutableArray arrayWithCapacity:files.size()];
        for(int i = 0; i < files.size(); i++) {
            auto f = files[i];
            auto skip = false;
            if (![extensions isEqual: @""]) {
                auto ext = f.absolutePath.substr(f.absolutePath.find_last_of(".") + 1);
                auto e = [[NSString alloc] initWithCString:ext.c_str() encoding:NSUTF8StringEncoding];
                if (![extensions containsString:e]) skip = true;
            }
            
            if (skip) continue;
            MediaLibraryFileEntry *entry = [self createFrom:files[i]];
            [entries addObject:[entry toNSDictionary]];
        }
        
        NSError *error;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:entries
                                                           options:0
                                                             error:&error];
        
        NSString *jsonString = @"[]";
        if (jsonData) {
            jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        }
        
        callback(@[jsonString]);
    });
}

// MARK: combineImages
- (void)combineImages:(JS::NativeMediaLibrary::SpecCombineImagesParams &)params callback:(RCTResponseSenderBlock)callback {
    auto resultSavePath = params.resultSavePath();
    auto mainImageIndex = params.mainImageIndex();
    auto backgroundColorNum = params.backgroundColor();
    
    UIColor *backgroundColor = [RCTConvert UIColor:[NSNumber numberWithDouble:backgroundColorNum]];
    
    auto arraySize = params.images().size();
    
    NSMutableArray * imagesPathArray = [[NSMutableArray alloc] initWithCapacity:arraySize];
    for (int i = 0; i < arraySize; i++) {
        auto obj = params.images().at(i);
        auto rawPath = obj.image();
        NSMutableDictionary* pos = [[NSMutableDictionary alloc] init];
        
        if (obj.positions().has_value()) {
            auto rawPos = obj.positions().value();
            NSInteger x = rawPos.x();
            NSInteger y = rawPos.y();
            @try {
                [pos setValue:[NSNumber numberWithDouble:x] forKey:@"x"];
                [pos setValue:[NSNumber numberWithDouble:y] forKey:@"y"];
            } @catch (NSException *exception) {
                NSLog(@"--");
            }
        }
        auto re = @{@"image": rawPath, @"positions": pos};
        [imagesPathArray addObject:re];
    }
    
    dispatch_async(defQueue, ^{
        NSMutableArray * imagesArray = [[NSMutableArray alloc] initWithCapacity:arraySize];
        
        for (NSDictionary* obj in imagesPathArray) {
            NSString *path = [obj valueForKey:@"image"];
            NSDictionary *positions = [obj valueForKey:@"positions"];
            auto image = [LibraryImageSize imageWithPath:path];
            if (image) [imagesArray addObject:@{@"image": image, @"positions": positions}];
        }
        [imagesPathArray removeAllObjects];
        NSString* error = [LibraryCombineImages combineImagesWithImages:imagesArray
                                                         resultSavePath:resultSavePath
                                                         mainImageIndex:mainImageIndex
                                                        backgroundColor:backgroundColor];
        
        if (error) {
            RCTLogWarn(@"MediaLibrary.combineImages error: %@", error);
        }
        
        auto result = error ? RESULT_FALSE : RESULT_TRUE;
        callback(@[result]);
    });
}

// MARK: imageResize
- (void)imageResize:(JS::NativeMediaLibrary::SpecImageResizeParams &)params callback:(RCTResponseSenderBlock)callback {
    
    auto uri = params.uri();
    auto rawWidth = params.width();
    auto rawHeight = params.height();
    auto format = params.format();
    auto resultSavePath = params.resultSavePath();
    
    NSNumber *width = [NSNumber numberWithDouble:rawWidth];
    NSNumber *height = [NSNumber numberWithDouble:rawHeight];
    
    dispatch_async(defQueue, ^{
        NSString* error = [LibraryImageResize resizeWithUri:uri
                                                      width:width
                                                     height:height
                                                     format:format
                                             resultSavePath:resultSavePath];
        
        if (error) {
            RCTLogWarn(@"MediaLibrary.imageResize error: %@", error);
        }
        
        auto result = error ? RESULT_FALSE : RESULT_TRUE;
        callback(@[result]);
    });
}

// MARK: imageCrop
- (void)imageCrop:(JS::NativeMediaLibrary::SpecImageCropParams &)params callback:(RCTResponseSenderBlock)callback {
    
    auto imageUri = params.uri();
    auto rawX = params.x();
    auto rawY = params.y();
    auto rawWidth = params.width();
    auto rawHeight = params.height();
    auto rawFormat = params.format();
    auto rawPath = params.resultSavePath();
    
    dispatch_async(defQueue, ^{
        NSString* error = [LibraryImageResize cropWithUri:imageUri
                                                        x:[NSNumber numberWithDouble:rawX]
                                                        y:[NSNumber numberWithDouble:rawY]
                                                    width:[NSNumber numberWithDouble:rawWidth]
                                                   height:[NSNumber numberWithDouble:rawHeight]
                                                   format:rawFormat
                                           resultSavePath:rawPath];
        
        if (error) {
            RCTLogWarn(@"MediaLibrary.imageCrop error: %@", error);
        }
        
        auto result = error ? RESULT_FALSE : RESULT_TRUE;
        callback(@[result]);
    });
}

// MARK: imageSizes
- (void)imageSizes:(JS::NativeMediaLibrary::SpecImageSizesParams &)params callback:(RCTResponseSenderBlock)callback {
    
    auto imagesPathArray = RCTConvertVecToArray(params.images());
    
    [LibraryImageSize getSizesWithPaths:imagesPathArray completion:^(NSString * _Nonnull result) {
        callback(@[result]);
    }];
    
}

// MARK: downloadAsBase64
- (void)downloadAsBase64:(JS::NativeMediaLibrary::SpecDownloadAsBase64Params &)params callback:(RCTResponseSenderBlock)callback {
    auto imageUrl = params.url();
    
    dispatch_async(defQueue, ^{
        [Base64Downloader downloadWithUrl:imageUrl completion:^(NSString * _Nullable string) {
            callback(@[string]);
        }];
    });
}

// MARK: cacheDir
- (NSString *)cacheDir {
    auto *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
    return paths;
}


@end
