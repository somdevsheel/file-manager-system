package com.filemanager.app.filemanager

import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File

class ShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "FileShare"

    private fun uriFor(file: File): Uri =
        FileProvider.getUriForFile(reactApplicationContext, "${reactApplicationContext.packageName}.fileprovider", file)

    private fun mimeTypeFor(file: File): String {
        val ext = file.name.substringAfterLast('.', "").lowercase()
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "*/*"
    }

    @ReactMethod
    fun shareFiles(paths: ReadableArray, promise: Promise) {
        try {
            val files = (0 until paths.size()).map { File(paths.getString(it)!!) }
            val context = reactApplicationContext
            val intent = if (files.size == 1) {
                Intent(Intent.ACTION_SEND).apply {
                    type = mimeTypeFor(files[0])
                    putExtra(Intent.EXTRA_STREAM, uriFor(files[0]))
                }
            } else {
                Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = "*/*"
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(files.map { uriFor(it) }))
                }
            }
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(Intent.createChooser(intent, "Share").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openFile(path: String, promise: Promise) {
        try {
            val file = File(path)
            val context = reactApplicationContext
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uriFor(file), mimeTypeFor(file))
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(intent, "Open with").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getContentUri(path: String, promise: Promise) {
        try {
            promise.resolve(uriFor(File(path)).toString())
        } catch (e: Exception) {
            promise.reject("URI_ERROR", e.message, e)
        }
    }
}
