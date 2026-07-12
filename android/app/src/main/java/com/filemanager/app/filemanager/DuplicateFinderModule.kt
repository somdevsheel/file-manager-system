package com.filemanager.app.filemanager

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.filemanager.app.filemanager.utils.FileEntryMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

private const val EVENT_PROGRESS = "DuplicateScanProgress"
private const val PARTIAL_HASH_BYTES = 8192

class DuplicateFinderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val cancelFlags = ConcurrentHashMap<String, AtomicBoolean>()

    override fun getName() = "DuplicateFinder"

    @ReactMethod
    fun cancelScan(scanId: String) {
        cancelFlags[scanId]?.set(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    @ReactMethod
    fun findDuplicates(rootPath: String, scanId: String, promise: Promise) {
        val cancelFlag = AtomicBoolean(false)
        cancelFlags[scanId] = cancelFlag
        scope.launch {
            try {
                val root = File(rootPath)
                val allFiles = mutableListOf<File>()
                val stack = ArrayDeque<File>()
                stack.add(root)
                while (stack.isNotEmpty()) {
                    if (cancelFlag.get()) {
                        promise.resolve(Arguments.createArray())
                        cancelFlags.remove(scanId)
                        return@launch
                    }
                    val current = stack.removeLast()
                    val children = current.listFiles() ?: continue
                    for (child in children) {
                        if (child.isDirectory) {
                            if (!child.name.startsWith(".")) stack.add(child)
                        } else if (child.length() > 0) {
                            allFiles.add(child)
                        }
                    }
                }

                // Stage 1: bucket by exact size — files with a unique size can't have a duplicate.
                val bySize = allFiles.groupBy { it.length() }.filterValues { it.size > 1 }
                val sizeCandidates = bySize.values.flatten()

                var scanned = 0
                val total = sizeCandidates.size
                emitProgress(scanId, scanned, total, false)

                // Stage 2: bucket candidates by a cheap partial hash (first 8KB) to cut down full reads.
                val byPartialHash = ConcurrentHashMap<String, MutableList<File>>()
                for (file in sizeCandidates) {
                    if (cancelFlag.get()) break
                    val hash = partialHash(file)
                    byPartialHash.getOrPut(hash) { mutableListOf() }.add(file)
                    scanned++
                    if (scanned % 25 == 0) emitProgress(scanId, scanned, total, false)
                }

                // Stage 3: full hash only within partial-hash collisions.
                val groups = mutableListOf<Pair<String, List<File>>>()
                for (bucket in byPartialHash.values.filter { it.size > 1 }) {
                    if (cancelFlag.get()) break
                    val byFullHash = bucket.groupBy { fullHash(it) }.filterValues { it.size > 1 }
                    for ((hash, files) in byFullHash) {
                        groups.add(hash to files)
                    }
                }

                emitProgress(scanId, total, total, true)

                val result: WritableArray = Arguments.createArray()
                for ((hash, files) in groups) {
                    val groupMap: WritableMap = Arguments.createMap()
                    groupMap.putString("hash", hash)
                    groupMap.putDouble("size", files.first().length().toDouble())
                    val fileArray: WritableArray = Arguments.createArray()
                    for (f in files) fileArray.pushMap(FileEntryMapper.fromFile(f))
                    groupMap.putArray("files", fileArray)
                    result.pushMap(groupMap)
                }
                promise.resolve(result)
                cancelFlags.remove(scanId)
            } catch (e: Exception) {
                cancelFlags.remove(scanId)
                promise.reject("DUPLICATE_SCAN_ERROR", e.message, e)
            }
        }
    }

    private fun emitProgress(scanId: String, scanned: Int, total: Int, done: Boolean) {
        val map: WritableMap = Arguments.createMap()
        map.putString("scanId", scanId)
        map.putInt("scanned", scanned)
        map.putInt("total", total)
        map.putBoolean("done", done)
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_PROGRESS, map)
    }

    private fun partialHash(file: File): String {
        val digest = MessageDigest.getInstance("MD5")
        file.inputStream().use { input ->
            val buffer = ByteArray(PARTIAL_HASH_BYTES)
            val read = input.read(buffer)
            if (read > 0) digest.update(buffer, 0, read)
        }
        digest.update(file.length().toString().toByteArray())
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun fullHash(file: File): String {
        val digest = MessageDigest.getInstance("MD5")
        file.inputStream().use { input ->
            val buffer = ByteArray(1 shl 16)
            var read: Int
            while (input.read(buffer).also { read = it } > 0) {
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}
