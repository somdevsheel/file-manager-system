package com.filemanager.app.filemanager

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.filemanager.app.filemanager.utils.FileCategoryUtils
import com.filemanager.app.filemanager.utils.FileEntryMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.util.PriorityQueue

class StorageAnalyzerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO)

    override fun getName() = "StorageAnalyzer"

    /**
     * Single recursive pass that produces everything the Storage Analyzer screen needs:
     * category size breakdown (for the pie chart), the largest N files, and the size of every
     * immediate child folder of [rootPath] (for the "largest folders" bar chart).
     */
    @ReactMethod
    fun analyzeStorage(rootPath: String, largestFilesLimit: Int, promise: Promise) {
        scope.launch {
            try {
                val root = File(rootPath)
                val categorySizes = HashMap<String, Long>()
                val categoryCounts = HashMap<String, Int>()
                val topLevelFolderSizes = LinkedHashMap<String, Long>()
                val topLevelFolders = root.listFiles { f -> f.isDirectory && !f.name.startsWith(".") } ?: emptyArray()
                for (folder in topLevelFolders) topLevelFolderSizes[folder.absolutePath] = 0L

                // Min-heap keyed by size so we can cheaply evict the smallest once we exceed the limit.
                val largestFiles = PriorityQueue<File>(compareBy { it.length() })

                val stack = ArrayDeque<Pair<File, File?>>() // file, owning top-level folder (null if directly under root)
                stack.add(root to null)
                while (stack.isNotEmpty()) {
                    val (current, owningFolder) = stack.removeLast()
                    val children = current.listFiles() ?: continue
                    for (child in children) {
                        val owner = owningFolder ?: if (current == root) child else owningFolder
                        if (child.isDirectory) {
                            if (!child.name.startsWith(".")) stack.add(child to owner)
                        } else {
                            val ext = child.name.substringAfterLast('.', "")
                            val category = FileCategoryUtils.categoryFor(ext, false)
                            categorySizes[category] = (categorySizes[category] ?: 0L) + child.length()
                            categoryCounts[category] = (categoryCounts[category] ?: 0) + 1

                            if (owner != null && topLevelFolderSizes.containsKey(owner.absolutePath)) {
                                topLevelFolderSizes[owner.absolutePath] = (topLevelFolderSizes[owner.absolutePath] ?: 0L) + child.length()
                            }

                            largestFiles.add(child)
                            if (largestFiles.size > largestFilesLimit) largestFiles.poll()
                        }
                    }
                }

                val result: WritableMap = Arguments.createMap()

                val categoryArray: WritableArray = Arguments.createArray()
                for ((category, size) in categorySizes) {
                    val entry: WritableMap = Arguments.createMap()
                    entry.putString("category", category)
                    entry.putDouble("size", size.toDouble())
                    entry.putInt("count", categoryCounts[category] ?: 0)
                    categoryArray.pushMap(entry)
                }
                result.putArray("categoryBreakdown", categoryArray)

                val folderArray: WritableArray = Arguments.createArray()
                for (folder in topLevelFolders) {
                    val entry: WritableMap = Arguments.createMap()
                    entry.putString("path", folder.absolutePath)
                    entry.putString("name", folder.name)
                    entry.putDouble("size", (topLevelFolderSizes[folder.absolutePath] ?: 0L).toDouble())
                    folderArray.pushMap(entry)
                }
                result.putArray("topLevelFolders", folderArray)

                val largestFilesArray: WritableArray = Arguments.createArray()
                largestFiles.sortedByDescending { it.length() }.forEach { largestFilesArray.pushMap(FileEntryMapper.fromFile(it)) }
                result.putArray("largestFiles", largestFilesArray)

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("STORAGE_ANALYZE_ERROR", e.message, e)
            }
        }
    }
}
