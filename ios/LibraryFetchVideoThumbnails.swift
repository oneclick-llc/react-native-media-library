//
//  LibraryFetchVideoThumbnails.swift
//  MediaLibrary
//
//  Created by Denis Zamataev on 09/06/2025.
//  Copyright © 2025 Oneclick-LLC. All rights reserved.
//

import Foundation
import AVFoundation
import UIKit
import Photos

@objc
public class LibraryFetchVideoThumbnails: NSObject {
    @objc public static func fetchVideoThumbnails(
        url: String,
        assetId: String,
        interval: Double,
        maximumWidth: Double,
        maximumHeight: Double,
        iosPreferredTimescale: Double,
        completion: @escaping (String?, Error?) -> Void
    ) {
        
        // Check if this is a Photos framework URL (ph:// schema)
        if url.hasPrefix("ph://") {
            handlePhotosAsset(url: url, assetId: assetId, interval: interval, maximumWidth: maximumWidth, maximumHeight: maximumHeight, iosPreferredTimescale: iosPreferredTimescale, completion: completion)
        } else {
            // Handle regular file URLs
            guard let videoURL = URL(string: url) else {
                completion(nil, NSError(domain: "VideoThumbnailError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))
                return
            }
            
            let asset = AVAsset(url: videoURL)
            processAsset(asset: asset, assetId: assetId, interval: interval, maximumWidth: maximumWidth, maximumHeight: maximumHeight, iosPreferredTimescale: iosPreferredTimescale, completion: completion)
        }
    }
    
    private static func handlePhotosAsset(
        url: String,
        assetId: String,
        interval: Double,
        maximumWidth: Double,
        maximumHeight: Double,
        iosPreferredTimescale: Double,
        completion: @escaping (String?, Error?) -> Void
    ) {
        // Extract PHAsset ID from ph:// URL
        let phAssetId = url.replacingOccurrences(of: "ph://", with: "")
        
        // Fetch PHAsset by ID
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [phAssetId], options: nil)
        
        guard let phAsset = fetchResult.firstObject else {
            completion(nil, NSError(domain: "VideoThumbnailError", code: 5, userInfo: [NSLocalizedDescriptionKey: "PHAsset not found for ID: \(phAssetId)"]))
            return
        }
        
        // Check if it's a video
        guard phAsset.mediaType == .video else {
            completion(nil, NSError(domain: "VideoThumbnailError", code: 6, userInfo: [NSLocalizedDescriptionKey: "PHAsset is not a video"]))
            return
        }
        
        // Request AVAsset from PHAsset
        let options = PHVideoRequestOptions()
        options.version = .original
        options.deliveryMode = .highQualityFormat
        options.isNetworkAccessAllowed = true
        
        PHImageManager.default().requestAVAsset(forVideo: phAsset, options: options) { (avAsset, audioMix, info) in
            guard let asset = avAsset else {
                let error = info?[PHImageErrorKey] as? Error ?? NSError(domain: "VideoThumbnailError", code: 7, userInfo: [NSLocalizedDescriptionKey: "Failed to get AVAsset from PHAsset"])
                completion(nil, error)
                return
            }
            
            processAsset(asset: asset, assetId: assetId, interval: interval, maximumWidth: maximumWidth, maximumHeight: maximumHeight, iosPreferredTimescale: iosPreferredTimescale, completion: completion)
        }
    }
    
    private static func processAsset(
        asset: AVAsset,
        assetId: String,
        interval: Double,
        maximumWidth: Double,
        maximumHeight: Double,
        iosPreferredTimescale: Double,
        completion: @escaping (String?, Error?) -> Void
    ) {
        // Sanitize assetId for folder name
        let sanitizedAssetId = assetId
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "\\", with: "_")
            .replacingOccurrences(of: ":", with: "_")
            .replacingOccurrences(of: "*", with: "_")
            .replacingOccurrences(of: "?", with: "_")
            .replacingOccurrences(of: "\"", with: "_")
            .replacingOccurrences(of: "<", with: "_")
            .replacingOccurrences(of: ">", with: "_")
            .replacingOccurrences(of: "|", with: "_")
        
        let imageGenerator = AVAssetImageGenerator(asset: asset)
        
        // Configure image generator
        imageGenerator.appliesPreferredTrackTransform = true
        imageGenerator.maximumSize = CGSize(width: maximumWidth, height: maximumHeight)
        imageGenerator.requestedTimeToleranceAfter = CMTime.zero
        imageGenerator.requestedTimeToleranceBefore = CMTime.zero
        
        // Load duration asynchronously
        if #available(iOS 15.0, *) {
            Task {
                do {
                    let duration = try await asset.load(.duration)
                    await processThumbnails(duration: duration, imageGenerator: imageGenerator, interval: interval, iosPreferredTimescale: iosPreferredTimescale, sanitizedAssetId: sanitizedAssetId, completion: completion)
                } catch {
                    completion(nil, error)
                }
            }
        } else {
            // Fallback for older iOS versions
            asset.loadValuesAsynchronously(forKeys: ["duration"]) {
                var error: NSError?
                let status = asset.statusOfValue(forKey: "duration", error: &error)
                
                if status == .loaded {
                    Task {
                        await processThumbnails(duration: asset.duration, imageGenerator: imageGenerator, interval: interval, iosPreferredTimescale: iosPreferredTimescale, sanitizedAssetId: sanitizedAssetId, completion: completion)
                    }
                } else {
                    completion(nil, error ?? NSError(domain: "VideoThumbnailError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to load asset duration"]))
                }
            }
        }
    }
    
    private static func processThumbnails(
        duration: CMTime,
        imageGenerator: AVAssetImageGenerator,
        interval: Double,
        iosPreferredTimescale: Double,
        sanitizedAssetId: String,
        completion: @escaping (String?, Error?) -> Void
    ) async {
        
        let durationSeconds = CMTimeGetSeconds(duration)
        
        // Generate time points for frames
        var times: [CMTime] = []
        var second: Double = 0
        
        while second < durationSeconds {
            let time = CMTime(seconds: second, preferredTimescale: CMTimeScale(iosPreferredTimescale))
            times.append(time)
            second += interval
        }
        
        guard !times.isEmpty else {
            completion(nil, NSError(domain: "VideoThumbnailError", code: 3, userInfo: [NSLocalizedDescriptionKey: "No frames to extract"]))
            return
        }
        
        // Setup caches directory
        guard let cachesDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            completion(nil, NSError(domain: "VideoThumbnailError", code: 4, userInfo: [NSLocalizedDescriptionKey: "Cannot access caches directory"]))
            return
        }
        
        let thumbnailsDirectory = cachesDirectory.appendingPathComponent("VideoThumbnails/\(sanitizedAssetId)")
        
        do {
            // Remove existing directory if it exists
            if FileManager.default.fileExists(atPath: thumbnailsDirectory.path) {
                try FileManager.default.removeItem(at: thumbnailsDirectory)
            }
            
            // Create fresh directory
            try FileManager.default.createDirectory(at: thumbnailsDirectory, withIntermediateDirectories: true)
        } catch {
            completion(nil, error)
            return
        }
        
        var thumbnailData: [(image: UIImage, actualTime: CMTime)] = []
        
        // Use modern async sequence for iOS 16+ or fallback to legacy method
        if #available(iOS 16.0, *) {
            let imageSequence = imageGenerator.images(for: times)
            
            for await element in imageSequence {
                switch element {
                case .success(_, let image, let actualTime):
                    let uiImage = UIImage(cgImage: image)
                    thumbnailData.append((image: uiImage, actualTime: actualTime))
                case .failure(let requestedTime, let error):
                    print("Error generating thumbnail at time \(CMTimeGetSeconds(requestedTime)): \(error)")
                }
            }
        } else {
            // Fallback for iOS 15 and earlier
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                var completedCount = 0
                let totalCount = times.count
                
                for time in times {
                    imageGenerator.generateCGImagesAsynchronously(forTimes: [NSValue(time: time)]) { requestedTime, image, actualTime, result, error in
                        defer {
                            completedCount += 1
                            if completedCount == totalCount {
                                continuation.resume()
                            }
                        }
                        
                        if let cgImage = image {
                            let uiImage = UIImage(cgImage: cgImage)
                            thumbnailData.append((image: uiImage, actualTime: actualTime))
                        }
                    }
                }
            }
        }
        
        // Sort by time to maintain order
        thumbnailData.sort { CMTimeCompare($0.actualTime, $1.actualTime) == -1 }
        
        // Save thumbnails and create JSON response
        var thumbnails: [[String: Any]] = []
        
        for (index, data) in thumbnailData.enumerated() {
            let filename = "frame_\(String(format: "%03d", index)).jpg"
            let fileURL = thumbnailsDirectory.appendingPathComponent(filename)
            
            do {
                if let jpegData = data.image.jpegData(compressionQuality: 0.8) {
                    try jpegData.write(to: fileURL)
                    
                    let timecodeMs = Int(CMTimeGetSeconds(data.actualTime) * 1000)
                    
                    let thumbnail: [String: Any] = [
                        "url": fileURL.absoluteString,
                        "width": Int(data.image.size.width),
                        "height": Int(data.image.size.height),
                        "timecodeMs": timecodeMs
                    ]
                    
                    thumbnails.append(thumbnail)
                }
            } catch {
                print("Error saving thumbnail \(filename): \(error)")
                continue
            }
        }
        
        // Convert to JSON
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: thumbnails, options: .prettyPrinted)
            let jsonString = String(data: jsonData, encoding: .utf8)
            completion(jsonString, nil)
        } catch {
            completion(nil, error)
        }
    }
}
