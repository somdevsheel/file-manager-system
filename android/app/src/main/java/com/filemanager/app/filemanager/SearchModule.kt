package com.filemanager.app.filemanager

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.filemanager.app.filemanager.utils.FileCategoryUtils
import com.filemanager.app.filemanager.utils.FileEntryMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

class SearchModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val cancelFlags = ConcurrentHashMap<String, AtomicBoolean>()

    override fun getName() = "FileSearch"

    @ReactMethod
    fun cancelSearch(searchId: String) {
        cancelFlags[searchId]?.set(true)
    }

    @ReactMethod
    fun search(rootPath: String, filters: ReadableMap, searchId: String, resultLimit: Int, promise: Promise) {
        val cancelFlag = AtomicBoolean(false)
        cancelFlags[searchId] = cancelFlag
        scope.launch {
            try {
                val query = if (filters.hasKey("query")) filters.getString("query") ?: "" else ""
                val extensions = readStringArray(filters, "extensions")?.map { it.lowercase() }?.toSet()
                val categories = readStringArray(filters, "categories")?.toSet()
                val minSize = if (filters.hasKey("minSize") && !filters.isNull("minSize")) filters.getDouble("minSize").toLong() else null
                val maxSize = if (filters.hasKey("maxSize") && !filters.isNull("maxSize")) filters.getDouble("maxSize").toLong() else null
                val modifiedAfter = if (filters.hasKey("modifiedAfter") && !filters.isNull("modifiedAfter")) filters.getDouble("modifiedAfter").toLong() else null
                val modifiedBefore = if (filters.hasKey("modifiedBefore") && !filters.isNull("modifiedBefore")) filters.getDouble("modifiedBefore").toLong() else null

                val result: WritableArray = Arguments.createArray()
                val root = File(rootPath)
                if (!root.exists()) {
                    promise.resolve(result)
                    cancelFlags.remove(searchId)
                    return@launch
                }
                val stack = ArrayDeque<File>()
                stack.add(root)
                var count = 0
                val lowerQuery = query.lowercase()

                while (stack.isNotEmpty() && count < resultLimit) {
                    if (cancelFlag.get()) break
                    val current = stack.removeLast()
                    val children = current.listFiles() ?: continue
                    for (child in children) {
                        if (child.isDirectory) {
                            if (!child.name.startsWith(".")) stack.add(child)
                            // Directories can also match the query themselves
                        }
                        if (lowerQuery.isNotEmpty() && !child.name.lowercase().contains(lowerQuery)) continue
                        if (extensions != null && extensions.isNotEmpty()) {
                            val ext = child.name.substringAfterLast('.', "").lowercase()
                            if (child.isDirectory || ext !in extensions) continue
                        }
                        if (!child.isDirectory) {
                            if (minSize != null && child.length() < minSize) continue
                            if (maxSize != null && child.length() > maxSize) continue
                        }
                        if (modifiedAfter != null && child.lastModified() < modifiedAfter) continue
                        if (modifiedBefore != null && child.lastModified() > modifiedBefore) continue
                        if (categories != null && categories.isNotEmpty()) {
                            val ext = child.name.substringAfterLast('.', "")
                            val cat = FileCategoryUtils.categoryFor(ext, child.isDirectory)
                            if (cat !in categories) continue
                        }
                        result.pushMap(FileEntryMapper.fromFile(child))
                        count++
                        if (count >= resultLimit) break
                    }
                }
                promise.resolve(result)
                cancelFlags.remove(searchId)
            } catch (e: Exception) {
                cancelFlags.remove(searchId)
                promise.reject("SEARCH_ERROR", e.message, e)
            }
        }
    }

    private fun readStringArray(map: ReadableMap, key: String): List<String>? {
        if (!map.hasKey(key) || map.isNull(key)) return null
        val array = map.getArray(key) ?: return null
        return (0 until array.size()).mapNotNull { array.getString(it) }
    }
}
