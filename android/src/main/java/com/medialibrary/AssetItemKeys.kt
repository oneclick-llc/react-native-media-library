package com.medialibrary

@Suppress("EnumEntryName")
enum class AssetItemKeys {
  filename,
  id,
  mediaType,
  location,
  creationTime,
  modificationTime,
  duration,
  width,
  height,
  url,
  uri,
  contentUri
}

@Suppress("EnumEntryName")
enum class AssetMediaType {
  video,
  audio,
  photo
}
