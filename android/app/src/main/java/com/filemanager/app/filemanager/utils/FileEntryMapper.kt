package com.filemanager.app.filemanager.utils

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import java.io.File

object FileEntryMapper {

    fun fromFile(file: File): WritableMap {
        val map = Arguments.createMap()
        val isDirectory = file.isDirectory
        val name = file.name
        val extension = if (!isDirectory && name.contains('.')) {
            name.substringAfterLast('.', "")
        } else {
            ""
        }
        map.putString("path", file.absolutePath)
        map.putString("name", name)
        map.putString("extension", extension.lowercase())
        map.putBoolean("isDirectory", isDirectory)
        map.putDouble("size", if (isDirectory) 0.0 else file.length().toDouble())
        map.putDouble("modifiedAt", file.lastModified().toDouble())
        map.putDouble("createdAt", file.lastModified().toDouble())
        map.putBoolean("isHidden", name.startsWith("."))
        map.putBoolean("canWrite", file.canWrite())
        map.putString("category", FileCategoryUtils.categoryFor(extension, isDirectory))
        return map
    }
}
