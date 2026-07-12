package com.filemanager.app.filemanager

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.filemanager.app.filemanager.utils.FileEntryMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

private const val EVENT_PROGRESS = "FileOperationProgress"

class FileOperationsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val cancelFlags = ConcurrentHashMap<String, AtomicBoolean>()

    override fun getName() = "FileOperations"

    @ReactMethod
    fun cancelOperation(operationId: String) {
        cancelFlags[operationId]?.set(true)
    }

    @ReactMethod
    fun addListener(eventName: String) { /* required by RN NativeEventEmitter, no-op */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* required by RN NativeEventEmitter, no-op */ }

    private fun emitProgress(
        operationId: String,
        type: String,
        currentFile: String,
        processedBytes: Long,
        totalBytes: Long,
        processedCount: Int,
        totalCount: Int,
        done: Boolean,
        cancelled: Boolean,
        error: String? = null,
    ) {
        val map: WritableMap = Arguments.createMap()
        map.putString("operationId", operationId)
        map.putString("type", type)
        map.putString("currentFile", currentFile)
        map.putDouble("processedBytes", processedBytes.toDouble())
        map.putDouble("totalBytes", totalBytes.toDouble())
        map.putInt("processedCount", processedCount)
        map.putInt("totalCount", totalCount)
        map.putBoolean("done", done)
        map.putBoolean("cancelled", cancelled)
        error?.let { map.putString("error", it) }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_PROGRESS, map)
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private fun collectFiles(root: File): List<File> {
        val out = mutableListOf<File>()
        val stack = ArrayDeque<File>()
        stack.add(root)
        while (stack.isNotEmpty()) {
            val current = stack.removeLast()
            if (current.isDirectory) {
                val children = current.listFiles()
                if (children == null || children.isEmpty()) {
                    out.add(current) // empty dir still needs to be created at destination
                } else {
                    stack.addAll(children)
                }
            } else {
                out.add(current)
            }
        }
        return out
    }

    private fun totalSize(files: List<File>): Long = files.sumOf { if (it.isFile) it.length() else 0L }

    private fun uniqueDestination(dir: File, name: String): File {
        var candidate = File(dir, name)
        if (!candidate.exists()) return candidate
        val dotIndex = name.lastIndexOf('.')
        val base = if (dotIndex > 0) name.substring(0, dotIndex) else name
        val ext = if (dotIndex > 0) name.substring(dotIndex) else ""
        var counter = 1
        while (candidate.exists()) {
            candidate = File(dir, "$base ($counter)$ext")
            counter++
        }
        return candidate
    }

    private fun copyFile(source: File, dest: File) {
        dest.parentFile?.mkdirs()
        FileInputStream(source).use { input ->
            FileOutputStream(dest).use { output ->
                input.copyTo(output, bufferSize = 1 shl 16)
            }
        }
        dest.setLastModified(source.lastModified())
    }

    // ---------------------------------------------------------------------
    // Copy
    // ---------------------------------------------------------------------

    @ReactMethod
    fun copyEntries(sourcePaths: ReadableArray, destDir: String, operationId: String, promise: Promise) {
        val cancelFlag = AtomicBoolean(false)
        cancelFlags[operationId] = cancelFlag
        scope.launch {
            try {
                val destination = File(destDir)
                destination.mkdirs()
                val roots = (0 until sourcePaths.size()).map { File(sourcePaths.getString(it)!!) }

                val allFiles = mutableListOf<Pair<File, File>>() // source -> dest
                val destinationRoots = mutableListOf<String>()
                for (root in roots) {
                    val targetRoot = uniqueDestination(destination, root.name)
                    destinationRoots.add(targetRoot.absolutePath)
                    if (root.isDirectory) {
                        val basePath = root.absolutePath
                        for (f in collectFiles(root)) {
                            val relative = f.absolutePath.removePrefix(basePath)
                            allFiles.add(f to File(targetRoot, relative))
                        }
                        if (collectFiles(root).isEmpty()) {
                            targetRoot.mkdirs()
                        }
                    } else {
                        allFiles.add(root to targetRoot)
                    }
                }

                val totalBytes = allFiles.sumOf { if (it.first.isFile) it.first.length() else 0L }
                var processedBytes = 0L
                var processedCount = 0

                for ((src, dst) in allFiles) {
                    if (cancelFlag.get()) {
                        emitProgress(operationId, "copy", src.name, processedBytes, totalBytes, processedCount, allFiles.size, true, true)
                        promise.resolve(Arguments.createArray())
                        cancelFlags.remove(operationId)
                        return@launch
                    }
                    if (src.isDirectory) {
                        dst.mkdirs()
                    } else {
                        copyFile(src, dst)
                        processedBytes += src.length()
                    }
                    processedCount++
                    emitProgress(operationId, "copy", src.name, processedBytes, totalBytes, processedCount, allFiles.size, false, false)
                }
                emitProgress(operationId, "copy", "", processedBytes, totalBytes, processedCount, allFiles.size, true, false)
                cancelFlags.remove(operationId)
                val resultArray = Arguments.createArray()
                destinationRoots.forEach { resultArray.pushString(it) }
                promise.resolve(resultArray)
            } catch (e: Exception) {
                emitProgress(operationId, "copy", "", 0, 0, 0, 0, true, false, e.message)
                cancelFlags.remove(operationId)
                promise.reject("COPY_ERROR", e.message, e)
            }
        }
    }

    // ---------------------------------------------------------------------
    // Move
    // ---------------------------------------------------------------------

    @ReactMethod
    fun moveEntries(sourcePaths: ReadableArray, destDir: String, operationId: String, promise: Promise) {
        val cancelFlag = AtomicBoolean(false)
        cancelFlags[operationId] = cancelFlag
        scope.launch {
            try {
                val destination = File(destDir)
                destination.mkdirs()
                val roots = (0 until sourcePaths.size()).map { File(sourcePaths.getString(it)!!) }
                val totalBytes = roots.sumOf { r -> collectFiles(r).sumOf { if (it.isFile) it.length() else 0L } }
                var processedBytes = 0L
                var processedCount = 0
                val totalCount = roots.size
                val destinationRoots = mutableListOf<String>()

                for (root in roots) {
                    if (cancelFlag.get()) {
                        emitProgress(operationId, "move", root.name, processedBytes, totalBytes, processedCount, totalCount, true, true)
                        promise.resolve(Arguments.createArray())
                        cancelFlags.remove(operationId)
                        return@launch
                    }
                    val target = uniqueDestination(destination, root.name)
                    val renamed = root.renameTo(target)
                    if (!renamed) {
                        // Cross-filesystem move (e.g. internal -> SD card): fall back to copy + delete
                        if (root.isDirectory) {
                            for (f in collectFiles(root)) {
                                val relative = f.absolutePath.removePrefix(root.absolutePath)
                                val dst = File(target, relative)
                                if (f.isDirectory) dst.mkdirs() else copyFile(f, dst)
                            }
                            root.deleteRecursively()
                        } else {
                            copyFile(root, target)
                            root.delete()
                        }
                    }
                    destinationRoots.add(target.absolutePath)
                    processedBytes += if (target.isFile) target.length() else 0L
                    processedCount++
                    emitProgress(operationId, "move", root.name, processedBytes, totalBytes, processedCount, totalCount, false, false)
                }
                emitProgress(operationId, "move", "", processedBytes, totalBytes, processedCount, totalCount, true, false)
                cancelFlags.remove(operationId)
                val resultArray = Arguments.createArray()
                destinationRoots.forEach { resultArray.pushString(it) }
                promise.resolve(resultArray)
            } catch (e: Exception) {
                emitProgress(operationId, "move", "", 0, 0, 0, 0, true, false, e.message)
                cancelFlags.remove(operationId)
                promise.reject("MOVE_ERROR", e.message, e)
            }
        }
    }

    // ---------------------------------------------------------------------
    // Delete (permanent)
    // ---------------------------------------------------------------------

    @ReactMethod
    fun deleteEntries(paths: ReadableArray, operationId: String, promise: Promise) {
        val cancelFlag = AtomicBoolean(false)
        cancelFlags[operationId] = cancelFlag
        scope.launch {
            try {
                val roots = (0 until paths.size()).map { File(paths.getString(it)!!) }
                var processedCount = 0
                for (root in roots) {
                    if (cancelFlag.get()) {
                        emitProgress(operationId, "delete", root.name, 0, 0, processedCount, roots.size, true, true)
                        promise.resolve(false)
                        cancelFlags.remove(operationId)
                        return@launch
                    }
                    root.deleteRecursively()
                    processedCount++
                    emitProgress(operationId, "delete", root.name, 0, 0, processedCount, roots.size, false, false)
                }
                emitProgress(operationId, "delete", "", 0, 0, processedCount, roots.size, true, false)
                cancelFlags.remove(operationId)
                promise.resolve(true)
            } catch (e: Exception) {
                emitProgress(operationId, "delete", "", 0, 0, 0, 0, true, false, e.message)
                cancelFlags.remove(operationId)
                promise.reject("DELETE_ERROR", e.message, e)
            }
        }
    }

    // ---------------------------------------------------------------------
    // Duplicate a single entry ("name (copy).ext") in its own directory
    // ---------------------------------------------------------------------

    @ReactMethod
    fun duplicateEntry(path: String, promise: Promise) {
        scope.launch {
            try {
                val source = File(path)
                if (!source.exists()) {
                    promise.reject("NOT_FOUND", "Source does not exist")
                    return@launch
                }
                val parent = source.parentFile ?: run {
                    promise.reject("NO_PARENT", "Cannot duplicate a root entry")
                    return@launch
                }
                val dotIndex = source.name.lastIndexOf('.')
                val base = if (!source.isDirectory && dotIndex > 0) source.name.substring(0, dotIndex) else source.name
                val ext = if (!source.isDirectory && dotIndex > 0) source.name.substring(dotIndex) else ""
                var candidate = File(parent, "$base (copy)$ext")
                var counter = 2
                while (candidate.exists()) {
                    candidate = File(parent, "$base (copy $counter)$ext")
                    counter++
                }
                if (source.isDirectory) {
                    for (f in collectFiles(source)) {
                        val relative = f.absolutePath.removePrefix(source.absolutePath)
                        val dst = File(candidate, relative)
                        if (f.isDirectory) dst.mkdirs() else copyFile(f, dst)
                    }
                    if (!candidate.exists()) candidate.mkdirs()
                } else {
                    copyFile(source, candidate)
                }
                promise.resolve(FileEntryMapper.fromFile(candidate))
            } catch (e: Exception) {
                promise.reject("DUPLICATE_ERROR", e.message, e)
            }
        }
    }
}
