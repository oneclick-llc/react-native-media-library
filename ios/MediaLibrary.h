
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNMediaLibrarySpec.h"

@interface MediaLibrary : NSObject <NativeMediaLibrarySpec>
#else
#import <React/RCTBridgeModule.h>

@interface MediaLibrary : NSObject <RCTBridgeModule>
#endif

@end
