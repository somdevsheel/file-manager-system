package com.filemanager.app.filemanager

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.github.junrar.Archive
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import net.lingala.zip4j.ZipFile
import net.lingala.zip4j.model.ZipParameters
import net.lingala.zip4j.model.enums.EncryptionMethod
import org.apache.commons.compress.archivers.sevenz.SevenZArchiveEntry
import org.apache.commons.compress.archivers.sevenz.SevenZFile
import org.apache.commons.compress.archivers.sevenz.SevenZOutputFile
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

private const val EVENT_PROGRESS = "FileOperationProgress"

class ArchiveModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val cancelFlags = ConcurrentHashMap<String, AtomicBoolean>()

    override fun getName() = "ArchiveManager"

    @ReactMethod
    fun cancelOperation(operationId: String) {
        cancelFlags[operationId]?.set(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    // Resolves an archive entry name against destDir and rejects entries that would escape it
    // (Zip Slip: "../../etc/evil", absolute paths, symlink-style tricks via ".." segments).
    private fun safeExtractionTarget(destDir: File, entryName: String): File {
        val destCanonical = destDir.canonicalFile
        val target = File(destCanonical, entryName).canonicalFile
        if (target != destCanonical && !target.path.startsWith(destCanonical.path + File.separator)) {
            throw SecurityException("Archive entry escapes destination directory: $entryName")
        }
        return target
    }

    private fun archiveType(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "zip" -> "zip"
        "rar" -> "rar"
        "7z" -> "sevenZip"
        else -> "unknown"
    }

    private fun emitProgress(
        operationId: String,
        type: String,
        currentFile: String,
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
        map.putDouble("processedBytes", 0.0)
        map.putDouble("totalBytes", 0.0)
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
    // Inspect
    // ---------------------------------------------------------------------

    @ReactMethod
    fun isEncrypted(path: String, promise: Promise) {
        scope.launch {
            try {
                val encrypted = when (archiveType(path)) {
                    "zip" -> ZipFile(path).isEncrypted
                    "sevenZip" -> {
                        try {
                            SevenZFile.builder().setFile(File(path)).get().use { false }
                        } catch (e: Exception) {
                            true // opening without a password failed -> assume encrypted
                        }
                    }
                    else -> false
                }
                promise.resolve(encrypted)
            } catch (e: Exception) {
                promise.reject("ARCHIVE_INSPECT_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun listArchiveEntries(path: String, password: String?, promise: Promise) {
        scope.launch {
            try {
                val result: WritableArray = Arguments.createArray()
                when (archiveType(path)) {
                    "zip" -> {
                        val zip = if (password != null) ZipFile(path, password.toCharArray()) else ZipFile(path)
                        for (header in zip.fileHeaders) {
                            val entry: WritableMap = Arguments.createMap()
                            entry.putString("name", header.fileName)
                            entry.putBoolean("isDirectory", header.isDirectory)
                            entry.putDouble("size", header.uncompressedSize.toDouble())
                            entry.putDouble("compressedSize", header.compressedSize.toDouble())
                            result.pushMap(entry)
                        }
                    }
                    "sevenZip" -> {
                        val builder = SevenZFile.builder().setFile(File(path))
                        password?.let { builder.setPassword(it.toCharArray()) }
                        builder.get().use { sevenZ ->
                            var e = sevenZ.nextEntry
                            while (e != null) {
                                val entry: WritableMap = Arguments.createMap()
                                entry.putString("name", e.name)
                                entry.putBoolean("isDirectory", e.isDirectory)
                                entry.putDouble("size", e.size.toDouble())
                                entry.putDouble("compressedSize", e.size.toDouble())
                                result.pushMap(entry)
                                e = sevenZ.nextEntry
                            }
                        }
                    }
                    "rar" -> {
                        val archive = if (password != null) Archive(File(path), password) else Archive(File(path))
                        var header = archive.nextFileHeader()
                        while (header != null) {
                            val entry: WritableMap = Arguments.createMap()
                            entry.putString("name", header.fileNameString)
                            entry.putBoolean("isDirectory", header.isDirectory)
                            entry.putDouble("size", header.fullUnpackSize.toDouble())
                            entry.putDouble("compressedSize", header.fullPackSize.toDouble())
                            result.pushMap(entry)
                            header = archive.nextFileHeader()
                        }
                        archive.close()
                    }
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ARCHIVE_LIST_ERROR", e.message, e)
            }
        }
    }

    // ---------------------------------------------------------------------
    // Extract
    // ---------------------------------------------------------------------

    @ReactMethod
    fun extractArchive(path: String, destDir: String, password: String?, operationId: String, promise: Promise) {
        val cancelFlag = AtomicBoolean(false)
        cancelFlags[operationId] = cancelFlag
        scope.launch {
            try {
                File(destDir).mkdirs()
                when (archiveType(path)) {
                    "zip" -> {
                        val zip = if (password != null) ZipFile(path, password.toCharArray()) else ZipFile(path)
                        val headers = zip.fileHeaders
                        for ((i, header) in headers.withIndex()) {
                            if (cancelFlag.get()) {
                                emitProgress(operationId, "unzip", "", i, headers.size, true, true)
                                promise.resolve(false)
                                cancelFlags.remove(operationId)
                                return@launch
                            }
                            zip.extractFile(header, destDir)
                            emitProgress(operationId, "unzip", header.fileName, i + 1, headers.size, false, false)
                        }
                    }
                    "sevenZip" -> {
                        val builder = SevenZFile.builder().setFile(File(path))
                        password?.let { builder.setPassword(it.toCharArray()) }
                        builder.get().use { sevenZ ->
                            var entry: SevenZArchiveEntry? = sevenZ.nextEntry
                            var count = 0
                            while (entry != null) {
                                if (cancelFlag.get()) {
                                    emitProgress(operationId, "unzip", "", count, count, true, true)
                                    promise.resolve(false)
                                    cancelFlags.remove(operationId)
                                    return@launch
                                }
                                val outFile = safeExtractionTarget(File(destDir), entry.name)
                                if (entry.isDirectory) {
                                    outFile.mkdirs()
                                } else {
                                    outFile.parentFile?.mkdirs()
                                    FileOutputStream(outFile).use { os ->
                                        val buffer = ByteArray(1 shl 16)
                                        var read: Int
                                        while (sevenZ.read(buffer).also { read = it } > 0) {
                                            os.write(buffer, 0, read)
                                        }
                                    }
                                }
                                count++
                                emitProgress(operationId, "unzip", entry.name, count, count, false, false)
                                entry = sevenZ.nextEntry
                            }
                        }
                    }
                    "rar" -> {
                        val archive = if (password != null) Archive(File(path), password) else Archive(File(path))
                        var header = archive.nextFileHeader()
                        var count = 0
                        while (header != null) {
                            if (cancelFlag.get()) {
                                emitProgress(operationId, "unzip", "", count, count, true, true)
                                promise.resolve(false)
                                cancelFlags.remove(operationId)
                                archive.close()
                                return@launch
                            }
                            val outFile = safeExtractionTarget(File(destDir), header.fileNameString.trim())
                            if (header.isDirectory) {
                                outFile.mkdirs()
                            } else {
                                outFile.parentFile?.mkdirs()
                                FileOutputStream(outFile).use { os -> archive.extractFile(header, os) }
                            }
                            count++
                            emitProgress(operationId, "unzip", header.fileNameString, count, count, false, false)
                            header = archive.nextFileHeader()
                        }
                        archive.close()
                    }
                    else -> {
                        promise.reject("UNSUPPORTED_FORMAT", "Unsupported archive format")
                        cancelFlags.remove(operationId)
                        return@launch
                    }
                }
                emitProgress(operationId, "unzip", "", 0, 0, true, false)
                cancelFlags.remove(operationId)
                promise.resolve(true)
            } catch (e: Exception) {
                emitProgress(operationId, "unzip", "", 0, 0, true, false, e.message)
                cancelFlags.remove(operationId)
                promise.reject("EXTRACT_ERROR", e.message, e)
            }
        }
    }

    // ---------------------------------------------------------------------
    // Create (ZIP and 7z only — RAR is a proprietary format with no legal open-source encoder)
    // ---------------------------------------------------------------------

    @ReactMethod
    fun createArchive(
        sourcePaths: ReadableArray,
        destPath: String,
        format: String,
        password: String?,
        operationId: String,
        promise: Promise,
    ) {
        val cancelFlag = AtomicBoolean(false)
        cancelFlags[operationId] = cancelFlag
        scope.launch {
            try {
                val sources = (0 until sourcePaths.size()).map { File(sourcePaths.getString(it)!!) }
                when (format) {
                    "zip" -> {
                        val zip = ZipFile(destPath, password?.toCharArray())
                        val params = ZipParameters()
                        if (password != null) {
                            params.isEncryptFiles = true
                            params.encryptionMethod = EncryptionMethod.AES
                        }
                        for ((i, src) in sources.withIndex()) {
                            if (cancelFlag.get()) {
                                emitProgress(operationId, "zip", "", i, sources.size, true, true)
                                promise.resolve(false)
                                cancelFlags.remove(operationId)
                                return@launch
                            }
                            if (src.isDirectory) zip.addFolder(src, params) else zip.addFile(src, params)
                            emitProgress(operationId, "zip", src.name, i + 1, sources.size, false, false)
                        }
                    }
                    "sevenZip" -> {
                        SevenZOutputFile(File(destPath)).use { out ->
                            var i = 0
                            for (src in sources) {
                                addToSevenZip(out, src, src.name)
                                i++
                                emitProgress(operationId, "zip", src.name, i, sources.size, false, false)
                                if (cancelFlag.get()) break
                            }
                        }
                    }
                    else -> {
                        promise.reject("UNSUPPORTED_FORMAT", "Only zip and 7z creation are supported")
                        cancelFlags.remove(operationId)
                        return@launch
                    }
                }
                emitProgress(operationId, "zip", "", 0, 0, true, false)
                cancelFlags.remove(operationId)
                promise.resolve(true)
            } catch (e: Exception) {
                emitProgress(operationId, "zip", "", 0, 0, true, false, e.message)
                cancelFlags.remove(operationId)
                promise.reject("CREATE_ARCHIVE_ERROR", e.message, e)
            }
        }
    }

    private fun addToSevenZip(out: SevenZOutputFile, file: File, entryName: String) {
        if (file.isDirectory) {
            val entry = out.createArchiveEntry(file, "$entryName/")
            out.putArchiveEntry(entry)
            out.closeArchiveEntry()
            file.listFiles()?.forEach { addToSevenZip(out, it, "$entryName/${it.name}") }
        } else {
            val entry = out.createArchiveEntry(file, entryName)
            out.putArchiveEntry(entry)
            out.write(file.readBytes())
            out.closeArchiveEntry()
        }
    }
}
