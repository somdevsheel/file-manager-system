package com.filemanager.app.filemanager

import android.database.Cursor
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.filemanager.app.filemanager.utils.FileCategoryUtils
import com.filemanager.app.filemanager.utils.FileEntryMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

class MediaCategoryModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO)

    override fun getName() = "MediaCategory"

    private val mediaStoreCategories = setOf("image", "video", "audio")

    @ReactMethod
    fun scanCategory(rootPath: String, category: String, limit: Int, promise: Promise) {
        scope.launch {
            try {
                val result = if (category in mediaStoreCategories) {
                    queryMediaStore(category, rootPath, limit)
                } else {
                    scanFilesystem(rootPath, category, limit)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("SCAN_CATEGORY_ERROR", e.message, e)
            }
        }
    }

    private fun queryMediaStore(category: String, rootPath: String, limit: Int): WritableArray {
        val result: WritableArray = Arguments.createArray()
        val collection = when (category) {
            "image" -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            "video" -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            "audio" -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            else -> return result
        }
        val projection = arrayOf(
            MediaStore.MediaColumns.DATA,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.SIZE,
            MediaStore.MediaColumns.DATE_MODIFIED,
        )
        val resolver = reactApplicationContext.contentResolver
        val sort = "${MediaStore.MediaColumns.DATE_MODIFIED} DESC LIMIT $limit"
        val cursor: Cursor? = try {
            resolver.query(collection, projection, null, null, sort)
        } catch (e: Exception) {
            // Some OEMs reject the LIMIT-in-sortOrder trick; fall back to unlimited sort.
            resolver.query(collection, projection, null, null, "${MediaStore.MediaColumns.DATE_MODIFIED} DESC")
        }
        cursor?.use {
            val dataIdx = it.getColumnIndexOrThrow(MediaStore.MediaColumns.DATA)
            var count = 0
            while (it.moveToNext() && count < limit) {
                val path = it.getString(dataIdx) ?: continue
                if (rootPath.isNotEmpty() && !path.startsWith(rootPath)) continue
                val file = File(path)
                if (!file.exists()) continue
                result.pushMap(FileEntryMapper.fromFile(file))
                count++
            }
        }
        return result
    }

    private fun scanFilesystem(rootPath: String, category: String, limit: Int): WritableArray {
        val result: WritableArray = Arguments.createArray()
        val extensions = FileCategoryUtils.extensionsForCategory(category)
        val root = File(rootPath)
        if (!root.exists()) return result
        val stack = ArrayDeque<File>()
        stack.add(root)
        var count = 0
        while (stack.isNotEmpty() && count < limit) {
            val current = stack.removeLast()
            val children = current.listFiles() ?: continue
            for (child in children) {
                if (child.isDirectory) {
                    if (!child.name.startsWith(".")) stack.add(child)
                } else {
                    val ext = child.name.substringAfterLast('.', "").lowercase()
                    val matches = if (category == "unknown") {
                        FileCategoryUtils.categoryFor(ext, false) == "unknown"
                    } else {
                        ext in extensions
                    }
                    if (matches) {
                        result.pushMap(FileEntryMapper.fromFile(child))
                        count++
                        if (count >= limit) break
                    }
                }
            }
        }
        return result
    }
}
