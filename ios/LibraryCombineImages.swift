//
//  LibraryCombineImages.swift
//  MediaLibrary
//
//  Created by sergeymild on 05/08/2023.
//  Copyright © 2023 Facebook. All rights reserved.
//

import Foundation

@objc
public class LibraryCombineImages: NSObject {
    @objc
    public static func combineImages(
        images: [UIImage],
        resultSavePath: NSString,
        mainImageIndex: NSInteger,
        backgroundColor: UIColor
    ) -> String? {
        if images.isEmpty {
            return "LibraryCombineImages.combineImages.emptyArray"
        }
        
        let mainImage = images[mainImageIndex]
        let parentCenterX = mainImage.size.width / 2
        let parentCenterY = mainImage.size.height / 2
        let newImageSize = CGSize(width: mainImage.size.width, height: mainImage.size.height)
        
        UIGraphicsBeginImageContextWithOptions(newImageSize, false, 1.0)
        backgroundColor.setFill()
        UIGraphicsGetCurrentContext()!.fill(CGRect(x: 0, y: 0, width: newImageSize.width, height: newImageSize.height))
        for image in images {
            let x = parentCenterX - image.size.width / 2
            let y = parentCenterY - image.size.height / 2
            image.draw(at: .init(x: x, y: y))
        }
        let finalImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        guard let finalImage = finalImage else {
            return "CombineImages.combineImages.emptyContext";
        }
        
        return LibraryImageSize.save(image: finalImage, format: "png", path: resultSavePath)
    }
}
