package com.medialibrary

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Log
import com.medialibrary.MediaLibraryUtils.withRetriever
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import androidx.core.net.toUri

private const val TAG = "VideoThumbnails"

fun Context.fetchFrame(input: JSONObject): JSONObject? {
  try {
    var response: JSONObject? = null
    val time = input.long("time") ?: 0
    val url = input.getString("url")
    val quality = input.long("quality") ?: 1
    withRetriever(contentResolver, Uri.parse(url)) { retriever ->
      retriever.getFrameAtTime(time, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)?.let { thumbnail ->
        val path = MediaLibraryUtils.generateOutputPath(cacheDir, "VideoThumbnails", "jpg")
        FileOutputStream(path).use { output ->
          thumbnail.compress(Bitmap.CompressFormat.JPEG, (quality * 100).toInt(), output)
          response = JSONObject().also {
            it.put("url", Uri.fromFile(File(path)).toString())
            it.put("width", thumbnail.width)
            it.put("height", thumbnail.height)
            it.put("timecodeMs", time)
          }
        }
      }
    }
    return response
  } catch (e: java.lang.RuntimeException) {
    return null
  }
}

fun Context.fetchThumbnails(input: JSONObject): JSONArray? {
  try {
    Log.d(TAG, "Starting thumbnail extraction")

    // Parse input parameters
    val url = input.getString("url")
    val assetId = input.getString("assetId")
    val intervalMs = (input.long("interval")?.times(1000)) ?: 1000 // Default 1 second in milliseconds
    val maximumWidth = input.long("maximumWidth") ?: 320
    val maximumHeight = input.long("maximumHeight") ?: 240

    Log.d(TAG, "Parameters - URL: $url, AssetId: $assetId, Interval: ${intervalMs}ms, MaxSize: ${maximumWidth}x${maximumHeight}")

    // Sanitize assetId for folder name
    val sanitizedAssetId = assetId
      .replace("/", "_")
      .replace("\\", "_")
      .replace(":", "_")
      .replace("*", "_")
      .replace("?", "_")
      .replace("\"", "_")
      .replace("<", "_")
      .replace(">", "_")
      .replace("|", "_")

    // Create thumbnails directory for this asset
    val thumbnailsDir = File(cacheDir, "VideoThumbnails/$sanitizedAssetId")

    // Remove existing directory if it exists
    if (thumbnailsDir.exists()) {
      Log.d(TAG, "Removing existing thumbnails directory: ${thumbnailsDir.path}")
      thumbnailsDir.deleteRecursively()
    }

    // Create fresh directory
    if (!thumbnailsDir.mkdirs()) {
      Log.e(TAG, "Failed to create thumbnails directory: ${thumbnailsDir.path}")
      return null
    }

    Log.d(TAG, "Created thumbnails directory: ${thumbnailsDir.path}")

    val thumbnails = JSONArray()
    var frameIndex = 0

    val retrieverResult = withRetriever(contentResolver, Uri.parse(url)) { retriever ->
      // Get video duration
      val durationString = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
      val durationMs = durationString?.toLongOrNull() ?: 0L

      Log.d(TAG, "Video duration: ${durationMs}ms (${durationMs / 1000.0}s)")

      if (durationMs <= 0) {
        Log.e(TAG, "Invalid video duration: $durationMs")
        return null
      }

      // Generate thumbnails at specified intervals
      var currentTimeMs = 0L

      while (currentTimeMs < durationMs) {
        try {
          Log.d(TAG, "Extracting frame at ${currentTimeMs}ms")

          // Convert to microseconds for MediaMetadataRetriever
          val timeUs = currentTimeMs * 1000

          // Extract frame at current time
          val bitmap = retriever.getFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)

          if (bitmap != null) {
            // Scale bitmap if necessary
            val scaledBitmap = scaleBitmapIfNeeded(bitmap, maximumWidth.toInt(), maximumHeight.toInt())

            // Generate filename
            val filename = "frame_${String.format("%03d", frameIndex)}.jpg"
            val thumbnailFile = File(thumbnailsDir, filename)

            // Save thumbnail to file
            FileOutputStream(thumbnailFile).use { output ->
              scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 80, output)
            }

            Log.d(TAG, "Saved thumbnail: ${thumbnailFile.path} (${scaledBitmap.width}x${scaledBitmap.height})")

            // Create thumbnail JSON object
            val thumbnailJson = JSONObject().apply {
              put("url", Uri.fromFile(thumbnailFile).toString())
              put("width", scaledBitmap.width)
              put("height", scaledBitmap.height)
              put("timecodeMs", currentTimeMs)
            }

            thumbnails.put(thumbnailJson)
            frameIndex++

            // Clean up scaled bitmap if it's different from original
            if (scaledBitmap != bitmap) {
              scaledBitmap.recycle()
            }
            bitmap.recycle()

          } else {
            Log.w(TAG, "Failed to extract frame at ${currentTimeMs}ms")
          }

        } catch (e: Exception) {
          Log.e(TAG, "Error extracting frame at ${currentTimeMs}ms", e)
        }

        // Move to next interval
        currentTimeMs += intervalMs
      }
    }
    Log.d(TAG, "withRetriever completed, result: $retrieverResult")

    Log.d(TAG, "Extraction complete. Generated ${thumbnails.length()} thumbnails")

    return thumbnails

  } catch (e: Exception) {
    Log.e(TAG, "Error in fetchThumbnails", e)
    return null
  }
}

/**
 * Scale bitmap to fit within maximum dimensions while maintaining aspect ratio
 */
private fun scaleBitmapIfNeeded(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Bitmap {
  val width = bitmap.width
  val height = bitmap.height

  // Check if scaling is needed
  if (width <= maxWidth && height <= maxHeight) {
    return bitmap
  }

  // Calculate scale factor to fit within bounds
  val scaleX = maxWidth.toFloat() / width
  val scaleY = maxHeight.toFloat() / height
  val scale = minOf(scaleX, scaleY)

  val newWidth = (width * scale).toInt()
  val newHeight = (height * scale).toInt()

  Log.d(TAG, "Scaling bitmap from ${width}x${height} to ${newWidth}x${newHeight}")

  return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
}
