package com.filemanager.app.filemanager

import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayOutputStream
import java.io.File

class ApkModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ApkManager"

    @ReactMethod
    fun getApkInfo(path: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val flags = PackageManager.GET_PERMISSIONS
            val packageInfo: PackageInfo? = pm.getPackageArchiveInfo(path, flags)
            if (packageInfo == null) {
                promise.reject("INVALID_APK", "Could not parse APK")
                return
            }
            packageInfo.applicationInfo?.sourceDir = path
            packageInfo.applicationInfo?.publicSourceDir = path

            val appName = packageInfo.applicationInfo?.let { pm.getApplicationLabel(it).toString() } ?: File(path).name
            val map: WritableMap = Arguments.createMap()
            map.putString("packageName", packageInfo.packageName)
            map.putString("versionName", packageInfo.versionName ?: "")
            map.putDouble(
                "versionCode",
                (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) packageInfo.longVersionCode else packageInfo.versionCode.toLong()).toDouble(),
            )
            map.putString("appName", appName)
            map.putInt("minSdkVersion", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) packageInfo.applicationInfo?.minSdkVersion ?: 0 else 0)
            map.putInt("targetSdkVersion", packageInfo.applicationInfo?.targetSdkVersion ?: 0)

            val permissions: WritableArray = Arguments.createArray()
            packageInfo.requestedPermissions?.forEach { permissions.pushString(it) }
            map.putArray("permissions", permissions)

            try {
                val icon: Drawable? = packageInfo.applicationInfo?.loadIcon(pm)
                icon?.let { map.putString("iconBase64", drawableToBase64(it)) }
            } catch (e: Exception) {
                // Icon is best-effort; ignore failures (some APKs reference missing resources)
            }

            val isInstalled = try {
                val installed = pm.getPackageInfo(packageInfo.packageName, 0)
                map.putString("installedVersionName", installed.versionName ?: "")
                true
            } catch (e: PackageManager.NameNotFoundException) {
                false
            }
            map.putBoolean("isInstalled", isInstalled)

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("APK_INFO_ERROR", e.message, e)
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 128
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 128
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        return android.util.Base64.encodeToString(stream.toByteArray(), android.util.Base64.NO_WRAP)
    }

    @ReactMethod
    fun installApk(path: String) {
        val context = reactApplicationContext
        val file = File(path)
        val uri: Uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(intent)
    }

    @ReactMethod
    fun isPackageInstalled(packageName: String, promise: Promise) {
        try {
            reactApplicationContext.packageManager.getPackageInfo(packageName, 0)
            promise.resolve(true)
        } catch (e: PackageManager.NameNotFoundException) {
            promise.resolve(false)
        }
    }
}
