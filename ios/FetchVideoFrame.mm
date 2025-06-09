//
//  FetchVideoFrame.m
//  MediaLibrary
//
//  Created by Sergei Golishnikov on 01/12/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//

#import "FetchVideoFrame.h"

#import <AVFoundation/AVFoundation.h>
#import <AVFoundation/AVAsset.h>
#import <Photos/Photos.h>

@implementation FetchVideoFrame

+ (BOOL)ensureDirExistsWithPath:(NSString *)path
{
  BOOL isDir = NO;
  NSError *error;
  BOOL exists = [[NSFileManager defaultManager] fileExistsAtPath:path isDirectory:&isDir];
  if (!(exists && isDir)) {
    [[NSFileManager defaultManager] createDirectoryAtPath:path withIntermediateDirectories:YES attributes:nil error:&error];
    if (error) {
      return NO;
    }
  }
  return YES;
}

+(NSString*)createVideoThumbnailsFolder {
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    NSString *cacheDirectory = [paths objectAtIndex:0];
    auto path = [[NSURL URLWithString:cacheDirectory] URLByAppendingPathComponent:@"VideoThumbnails"];
    [self ensureDirExistsWithPath:path.absoluteString];
    return path.absoluteString;
}


// ATTENTION: This is a legacy method that will not work on modern iOS. Use fetchVideoFrameById instead.
+(nullable NSString*)fetchVideoFrame:(NSString*)url time:(double)time quality:(double)quality {
    NSLog(@"fetchVideoFrame: time: %f, quality: %f url: %@", time, quality, url);
    
    NSString *p = [url stringByReplacingOccurrencesOfString:@"file://" withString:@""];
    NSURL *nsUrl = [NSURL URLWithString:url];
    if (![[NSFileManager defaultManager] fileExistsAtPath:p]) {
        NSLog(@"File does not exist at path: %@", p);
        return NULL;
    }

    // Start security-scoped access
    BOOL hasAccess = [nsUrl startAccessingSecurityScopedResource];
    if (!hasAccess) {
        NSLog(@"Failed to start security-scoped access for URL: %@", url);
        return NULL;
    }

    AVURLAsset *asset = [[AVURLAsset alloc] initWithURL:nsUrl options:nil];
    AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:asset];
    generator.appliesPreferredTrackTransform = YES;
    generator.requestedTimeToleranceBefore = kCMTimeZero;
    generator.requestedTimeToleranceAfter = kCMTimeZero;

    NSError *err = NULL;
    CMTime cmTime = CMTimeMake(time * 1000, 1000);
    CGImageRef imgRef = [generator copyCGImageAtTime:cmTime actualTime:NULL error:&err];
    
    // Stop security-scoped access
    [nsUrl stopAccessingSecurityScopedResource];

    if (err) {
        NSLog(@"Error generating image: %@", err.localizedFailureReason);
        return NULL;
    }

    UIImage *thumbnail = [UIImage imageWithCGImage:imgRef];

    NSString *fileName = [[[NSUUID UUID] UUIDString] stringByAppendingString:@".jpg"];
    NSString *newPath = [[self createVideoThumbnailsFolder] stringByAppendingPathComponent:fileName];
    NSLog(@"writeTo: %@", newPath);
    NSData *data = UIImageJPEGRepresentation(thumbnail, quality);

    if (![data writeToFile:newPath atomically:YES]) {
        NSLog(@"Error: Can't write to file");
        CGImageRelease(imgRef);
        return NULL;
    }

    NSURL *fileURL = [NSURL fileURLWithPath:newPath];
    NSString *filePath = [fileURL absoluteString];

    CGImageRelease(imgRef);

    NSMutableDictionary *response = [[NSMutableDictionary alloc] initWithCapacity:3];
    [response setValue:filePath forKey:@"url"];
    [response setValue:@(thumbnail.size.width) forKey:@"width"];
    [response setValue:@(thumbnail.size.height) forKey:@"height"];
    [response setValue:@(0) forKey:@"timecodeMs"];

    NSError *jsonError;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:response
                                                       options:NSJSONWritingPrettyPrinted
                                                         error:&jsonError];
    if (jsonError) {
        NSLog(@"Error serializing JSON: %@", jsonError.localizedDescription);
        return NULL;
    }

    return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
}

+(nullable NSString*)fetchVideoFrameById:(NSString*)localIdentifier time:(double)time quality:(double)quality {
    NSLog(@"fetchVideoFrame: time: %f, quality: %f localIdentifier: %@", time, quality, localIdentifier);

    __block NSString *result = nil;
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

    [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus status) {
        if (status != PHAuthorizationStatusAuthorized) {
            NSLog(@"Photos access denied. Status: %ld", (long)status);
            dispatch_semaphore_signal(semaphore);
            return;
        }

        // Fetch PHAsset by local identifier
        PHFetchResult<PHAsset *> *fetchResult = [PHAsset fetchAssetsWithLocalIdentifiers:@[localIdentifier] options:nil];
        PHAsset *targetAsset = fetchResult.firstObject;

        if (!targetAsset) {
            NSLog(@"No video asset found for local identifier: %@", localIdentifier);
            dispatch_semaphore_signal(semaphore);
            return;
        }

        // Request AVAsset for the video
        PHVideoRequestOptions *options = [[PHVideoRequestOptions alloc] init];
        options.version = PHVideoRequestOptionsVersionOriginal;
        options.networkAccessAllowed = YES;

        [[PHImageManager defaultManager] requestAVAssetForVideo:targetAsset options:options resultHandler:^(AVAsset *avAsset, AVAudioMix *audioMix, NSDictionary *info) {
            if (!avAsset) {
                NSLog(@"Failed to load AVAsset. Info: %@", info);
                dispatch_semaphore_signal(semaphore);
                return;
            }

            // Create image generator
            AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:avAsset];
            generator.appliesPreferredTrackTransform = YES;
            generator.requestedTimeToleranceBefore = kCMTimeZero;
            generator.requestedTimeToleranceAfter = kCMTimeZero;

            NSError *err = nil;
            CMTime cmTime = CMTimeMake(time * 1000, 1000);
            CGImageRef imgRef = [generator copyCGImageAtTime:cmTime actualTime:NULL error:&err];
            if (err) {
                NSLog(@"Error generating image: %@", err.localizedFailureReason);
                dispatch_semaphore_signal(semaphore);
                return;
            }

            UIImage *thumbnail = [UIImage imageWithCGImage:imgRef];

            // Save thumbnail to file
            NSString *thumbnailFileName = [[[NSUUID UUID] UUIDString] stringByAppendingString:@".jpg"];
            NSString *newPath = [[self createVideoThumbnailsFolder] stringByAppendingPathComponent:thumbnailFileName];
            NSLog(@"Writing thumbnail to: %@", newPath);
            NSData *data = UIImageJPEGRepresentation(thumbnail, quality);

            if (![data writeToFile:newPath atomically:YES]) {
                NSLog(@"Error: Can't write thumbnail to file");
                CGImageRelease(imgRef);
                dispatch_semaphore_signal(semaphore);
                return;
            }

            NSURL *fileURL = [NSURL fileURLWithPath:newPath];
            NSString *filePath = [fileURL absoluteString];

            CGImageRelease(imgRef);

            // Create JSON response
            NSMutableDictionary *response = [[NSMutableDictionary alloc] initWithCapacity:3];
            [response setValue:filePath forKey:@"url"];
            [response setValue:@(thumbnail.size.width) forKey:@"width"];
            [response setValue:@(thumbnail.size.height) forKey:@"height"];
            [response setValue:@(0) forKey:@"timecodeMs"];

            NSError *jsonError;
            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:response
                                                               options:NSJSONWritingPrettyPrinted
                                                                 error:&jsonError];
            if (jsonError) {
                NSLog(@"Error serializing JSON: %@", jsonError.localizedDescription);
                dispatch_semaphore_signal(semaphore);
                return;
            }

            result = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
            dispatch_semaphore_signal(semaphore);
        }];
    }];

    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
    return result;
}

@end
