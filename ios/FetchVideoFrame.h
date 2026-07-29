//
//  FetchVideoFrame.h
//  MediaLibrary
//
//  Created by Sergei Golishnikov on 01/12/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "json.h"
NS_ASSUME_NONNULL_BEGIN

@interface FetchVideoFrame : NSObject
// ATTENTION: This is a legacy method that will not work on modern iOS. Use fetchVideoFrameById instead.
+(nullable NSString*)fetchVideoFrame:(NSString*)url time:(double)time quality:(double)quality;

+(nullable NSString*)fetchVideoFrameById:(NSString*)localIdentifier time:(double)time quality:(double)quality;
@end

NS_ASSUME_NONNULL_END
