package com.filemanager.app.filemanager

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.os.storage.StorageManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.filemanager.app.filemanager.utils.FileEntryMapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

class FileSystemModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO)

    override fun getName() = "FileSystem"

    // ---------------------------------------------------------------------
    // Permissions
    // ---------------------------------------------------------------------

    @ReactMethod
    fun hasAllFilesAccess(promise: Promise) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            true
        }
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestAllFilesAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val intent = Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                intent.data = Uri.parse("package:" + reactApplicationContext.packageName)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            } catch (e: Exception) {
                val intent = Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
        }
    }

    // ---------------------------------------------------------------------
    // Storage volumes
    // ---------------------------------------------------------------------

    @ReactMethod
    fun getStorageVolumes(promise: Promise) {
        scope.launch {
            try {
                val result: WritableArray = Arguments.createArray()
                val storageManager =
                    reactApplicationContext.getSystemService(Context.STORAGE_SERVICE) as StorageManager

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    val volumes = storageManager.storageVolumes
                    for (volume in volumes) {
                        val dir = getVolumeDir(volume) ?: continue
                        val statFs = try { StatFs(dir.absolutePath) } catch (e: Exception) { null }
                        val map = Arguments.createMap()
                        map.putString("id", volume.uuid ?: if (volume.isPrimary) "primary" else dir.absolutePath)
                        map.putString("label", volume.getDescription(reactApplicationContext) ?: dir.name)
                        map.putString("path", dir.absolutePath)
                        map.putBoolean("isRemovable", volume.isRemovable)
                        map.putBoolean("isPrimary", volume.isPrimary)
                        map.putDouble("totalBytes", statFs?.let { it.blockSizeLong * it.blockCountLong }?.toDouble() ?: 0.0)
                        map.putDouble("freeBytes", statFs?.let { it.blockSizeLong * it.availableBlocksLong }?.toDouble() ?: 0.0)
                        result.pushMap(map)
                    }
                } else {
                    val dir = Environment.getExternalStorageDirectory()
                    val statFs = StatFs(dir.absolutePath)
                    val map = Arguments.createMap()
                    map.putString("id", "primary")
                    map.putString("label", "Internal Storage")
                    map.putString("path", dir.absolutePath)
                    map.putBoolean("isRemovable", false)
                    map.putBoolean("isPrimary", true)
                    map.putDouble("totalBytes", (statFs.blockSizeLong * statFs.blockCountLong).toDouble())
                    map.putDouble("freeBytes", (statFs.blockSizeLong * statFs.availableBlocksLong).toDouble())
                    result.pushMap(map)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("STORAGE_VOLUMES_ERROR", e.message, e)
            }
        }
    }

    private fun getVolumeDir(volume: android.os.storage.StorageVolume): File? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            volume.directory?.let { return it }
        }
        return try {
            val method = volume.javaClass.getMethod("getPathFile")
            method.invoke(volume) as? File
        } catch (e: Exception) {
            try {
                val getPath = volume.javaClass.getMethod("getPath")
                val path = getPath.invoke(volume) as? String
                path?.let { File(it) }
            } catch (e2: Exception) {
                null
            }
        }
    }

    // ---------------------------------------------------------------------
    // Directory listing / stat
    // ---------------------------------------------------------------------

    @ReactMethod
    fun listDirectory(path: String, promise: Promise) {
        scope.launch {
            try {
                val dir = File(path)
                if (!dir.exists() || !dir.isDirectory) {
                    promise.reject("NOT_A_DIRECTORY", "Path does not exist or is not a directory: $path")
                    return@launch
                }
                val children = dir.listFiles()
                val result: WritableArray = Arguments.createArray()
                if (children != null) {
                    for (child in children) {
                        result.pushMap(FileEntryMapper.fromFile(child))
                    }
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("LIST_DIRECTORY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getFileInfo(path: String, promise: Promise) {
        scope.launch {
            try {
                val file = File(path)
                if (!file.exists()) {
                    promise.reject("NOT_FOUND", "File does not exist: $path")
                    return@launch
                }
                promise.resolve(FileEntryMapper.fromFile(file))
            } catch (e: Exception) {
                promise.reject("GET_FILE_INFO_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun exists(path: String, promise: Promise) {
        promise.resolve(File(path).exists())
    }

    // ---------------------------------------------------------------------
    // Create / rename
    // ---------------------------------------------------------------------

    @ReactMethod
    fun createFolder(path: String, promise: Promise) {
        scope.launch {
            try {
                val dir = File(path)
                if (dir.exists()) {
                    promise.reject("ALREADY_EXISTS", "A file or folder already exists at this path")
                    return@launch
                }
                if (dir.mkdirs()) {
                    promise.resolve(FileEntryMapper.fromFile(dir))
                } else {
                    promise.reject("CREATE_FOLDER_ERROR", "Failed to create folder")
                }
            } catch (e: Exception) {
                promise.reject("CREATE_FOLDER_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun createFile(path: String, promise: Promise) {
        scope.launch {
            try {
                val file = File(path)
                if (file.exists()) {
                    promise.reject("ALREADY_EXISTS", "A file or folder already exists at this path")
                    return@launch
                }
                file.parentFile?.mkdirs()
                if (file.createNewFile()) {
                    promise.resolve(FileEntryMapper.fromFile(file))
                } else {
                    promise.reject("CREATE_FILE_ERROR", "Failed to create file")
                }
            } catch (e: Exception) {
                promise.reject("CREATE_FILE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun rename(oldPath: String, newPath: String, promise: Promise) {
        scope.launch {
            try {
                val source = File(oldPath)
                val dest = File(newPath)
                if (!source.exists()) {
                    promise.reject("NOT_FOUND", "Source does not exist")
                    return@launch
                }
                if (dest.exists()) {
                    promise.reject("ALREADY_EXISTS", "Destination already exists")
                    return@launch
                }
                if (source.renameTo(dest)) {
                    promise.resolve(FileEntryMapper.fromFile(dest))
                } else {
                    promise.reject("RENAME_ERROR", "Failed to rename")
                }
            } catch (e: Exception) {
                promise.reject("RENAME_ERROR", e.message, e)
            }
        }
    }

    // ---------------------------------------------------------------------
    // Folder statistics
    // ---------------------------------------------------------------------

    @ReactMethod
    fun computeFolderStats(path: String, promise: Promise) {
        scope.launch {
            try {
                var totalFiles = 0
                var totalFolders = 0
                var totalSize = 0L
                var largest: File? = null
                var oldest: File? = null
                var newest: File? = null

                val stack = ArrayDeque<File>()
                stack.add(File(path))
                while (stack.isNotEmpty()) {
                    val current = stack.removeLast()
                    val children = current.listFiles() ?: continue
                    for (child in children) {
                        if (child.isDirectory) {
                            totalFolders++
                            stack.add(child)
                        } else {
                            totalFiles++
                            totalSize += child.length()
                            if (largest == null || child.length() > largest!!.length()) largest = child
                            if (oldest == null || child.lastModified() < oldest!!.lastModified()) oldest = child
                            if (newest == null || child.lastModified() > newest!!.lastModified()) newest = child
                        }
                    }
                }

                val result = Arguments.createMap()
                result.putInt("totalFiles", totalFiles)
                result.putInt("totalFolders", totalFolders)
                result.putDouble("totalSize", totalSize.toDouble())
                largest?.let { result.putMap("largestFile", FileEntryMapper.fromFile(it)) }
                oldest?.let { result.putMap("oldestFile", FileEntryMapper.fromFile(it)) }
                newest?.let { result.putMap("newestFile", FileEntryMapper.fromFile(it)) }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("FOLDER_STATS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getDirectorySize(path: String, promise: Promise) {
        scope.launch {
            try {
                var totalSize = 0L
                val stack = ArrayDeque<File>()
                stack.add(File(path))
                while (stack.isNotEmpty()) {
                    val current = stack.removeLast()
                    val children = current.listFiles() ?: continue
                    for (child in children) {
                        if (child.isDirectory) stack.add(child) else totalSize += child.length()
                    }
                }
                promise.resolve(totalSize.toDouble())
            } catch (e: Exception) {
                promise.reject("DIR_SIZE_ERROR", e.message, e)
            }
        }
    }
}
