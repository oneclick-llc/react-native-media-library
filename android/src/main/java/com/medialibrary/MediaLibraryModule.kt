package com.medialibrary

import android.net.Uri
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import android.provider.MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.reactnativemedialibrary.Base64Downloader
import com.reactnativemedialibrary.ManipulateImages
import com.reactnativemedialibrary.MediaLibrary
import com.reactnativemedialibrary.MediaLibraryUtils
import com.reactnativemedialibrary.MedialLibraryCreateAsset
import com.reactnativemedialibrary.fetchFrame
import com.reactnativemedialibrary.getCollections
import com.reactnativemedialibrary.singleQuery
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileFilter

fun ReadableMap.asJsonInput(): JSONObject {
  return JSONObject(toHashMap() as Map<*, *>?)
}

@ReactModule(name = MediaLibraryModule.NAME)
class MediaLibraryModule(private val reactContext: ReactApplicationContext) :
  NativeMediaLibrarySpec(reactContext) {
  private val mediaLibrary = MediaLibrary(reactContext)
  private val manipulateImages = ManipulateImages(reactContext)

  private val job = SupervisorJob()
  val scope = CoroutineScope(Dispatchers.IO + job)

  override fun getName(): String {
    return NAME
  }

  override fun getAssets(options: ReadableMap?, callback: Callback?) {
    if (options == null) {
      callback?.invoke(Arguments.createArray())
      return
    }
    mediaLibrary.getAssets(options.asJsonInput()) {
      callback?.invoke(it)
    }
  }

  override fun getFromDisk(options: ReadableMap, callback: Callback) {
    scope.launch {
      val extensions = (options.getString("extensions") ?: "").lowercase()
      val isEmpty = extensions.isEmpty()
      val file = File(options.getString("path")!!)
      val array = JSONArray()
      val listFiles = file.listFiles(FileFilter {
        if (isEmpty) return@FileFilter true
        return@FileFilter extensions.contains(it.extension.lowercase())
      }) ?: emptyArray()
      for (listFile in listFiles) {
        val jsonObject = JSONObject()
        jsonObject.put("name", listFile.name)
        jsonObject.put("absolutePath", listFile.absolutePath)
        jsonObject.put("isDirectory", listFile.isDirectory)
        jsonObject.put("size", listFile.length())
        jsonObject.put("modificationDate", listFile.lastModified())
        array.put(jsonObject)
      }
      callback(array.toString())
    }
  }

  override fun getCollections(callback: Callback) {
    scope.launch {
      val contentResolver = reactContext.contentResolver
      val jsonArray = contentResolver.getCollections(MEDIA_TYPE_IMAGE)
      callback.invoke(jsonArray.toString())
    }
  }

  override fun getAsset(id: String, callback: Callback) {
    scope.launch {
      val contentResolver = reactContext.contentResolver
      val jsonArray = contentResolver.singleQuery(
        EXTERNAL_CONTENT_URI,
        reactContext,
        JSONObject(),
        id
      )
      if (jsonArray.length() == 0) {
        return@launch callback("")
      }
      val media = jsonArray.getJSONObject(0)
      MediaLibraryUtils.getMediaLocation(media, contentResolver)
      callback(media.toString())
    }
  }

  override fun exportVideo(params: ReadableMap, callback: Callback) {
    TODO("Not yet implemented")
  }

  override fun saveToLibrary(params: ReadableMap, callback: Callback) {
    scope.launch {
      val input = params.asJsonInput()
      MedialLibraryCreateAsset.saveToLibrary(input, reactContext) { error, id ->
        if (error != null) {
          callback(error)
        } else {
          getAsset(id!!, callback)
        }
      }
    }
  }

  override fun fetchVideoFrame(params: ReadableMap, callback: Callback) {
    scope.launch {
      val input = params.asJsonInput()
      val response = reactContext.fetchFrame(input)
      if (response == null) {
        callback("")
      } else {
        callback(response.toString())
      }
    }
  }

  override fun combineImages(params: ReadableMap, callback: Callback) {
    scope.launch {
      val input = params.asJsonInput()
      if (manipulateImages.combineImages(input)) {
        callback("{\"result\": true}")
      } else {
        callback("{\"result\": false}")
      }
    }
  }

  override fun imageResize(params: ReadableMap, callback: Callback) {
    scope.launch {
      val input = params.asJsonInput()
      if (manipulateImages.imageResize(input)) {
        callback("{\"result\": true}")
      } else {
        callback("{\"result\": false}")
      }
    }
  }

  override fun imageCrop(params: ReadableMap, callback: Callback) {
    scope.launch {
      val input = params.asJsonInput()
      if (manipulateImages.imageCrop(input)) {
        callback("{\"result\": true}")
      } else {
        callback("{\"result\": false}")
      }
    }
  }

  override fun imageSizes(params: ReadableMap, callback: Callback) {
    scope.launch {
      val input = params.asJsonInput()
      callback(manipulateImages.imageSizes(input).toString())
    }
  }

  override fun downloadAsBase64(params: ReadableMap, callback: Callback) {
    scope.launch {
      val input = params.asJsonInput()
      val base64String = Base64Downloader.download(input.getString("url"))
      val response = JSONObject()
      response.put("base64", base64String)
      callback(response.toString())
    }
  }

  override fun cacheDir(): String {
    return reactContext.cacheDir.absolutePath
  }

  companion object {
    const val NAME = "MediaLibrary"

    var EXTERNAL_CONTENT_URI: Uri = MediaStore.Files.getContentUri("external")
  }
}
