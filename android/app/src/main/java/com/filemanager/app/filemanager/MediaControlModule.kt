package com.filemanager.app.filemanager

import android.content.Context
import android.content.pm.ActivityInfo
import android.media.AudioManager
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Brightness is set via the current Activity's window attributes rather than the system-wide
 * setting, so it's scoped to this screen only, resets automatically on exit, and needs no
 * WRITE_SETTINGS permission (which requires a special user-granted toggle in system settings).
 * Volume adjusts the media (STREAM_MUSIC) stream directly with no UI flag, since the video player
 * shows its own on-screen indicator instead of the native volume overlay.
 */
class MediaControlModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "MediaControl"

    private val audioManager: AudioManager
        get() = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    @ReactMethod
    fun getBrightness(promise: Promise) {
        val windowBrightness = reactApplicationContext.currentActivity?.window?.attributes?.screenBrightness ?: -1f
        if (windowBrightness in 0f..1f) {
            promise.resolve(windowBrightness.toDouble())
            return
        }
        try {
            val systemBrightness = Settings.System.getInt(reactApplicationContext.contentResolver, Settings.System.SCREEN_BRIGHTNESS)
            promise.resolve(systemBrightness / 255.0)
        } catch (e: Settings.SettingNotFoundException) {
            promise.resolve(0.5)
        }
    }

    @ReactMethod
    fun setBrightness(value: Double) {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            val window = activity.window
            val attributes = window.attributes
            attributes.screenBrightness = value.toFloat().coerceIn(0f, 1f)
            window.attributes = attributes
        }
    }

    /** Reverts the window to following the system brightness. Call when leaving the video screen. */
    @ReactMethod
    fun clearBrightnessOverride() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            val window = activity.window
            val attributes = window.attributes
            attributes.screenBrightness = android.view.WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            window.attributes = attributes
        }
    }

    @ReactMethod
    fun getVolume(promise: Promise) {
        val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
        promise.resolve(if (max > 0) current.toDouble() / max else 0.0)
    }

    @ReactMethod
    fun setVolume(value: Double) {
        val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val index = (value.coerceIn(0.0, 1.0) * max).toInt()
        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, index, 0)
    }

    /** Rotates to (and locks) landscape — used for the video player's custom fullscreen mode. */
    @ReactMethod
    fun lockLandscape() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        }
    }

    /**
     * Forces portrait — used when the user explicitly exits fullscreen. Unlike unlockOrientation(),
     * this actually returns to portrait even if the device is still being held sideways at that
     * moment, instead of just following the sensor (which would keep it in landscape).
     */
    @ReactMethod
    fun lockPortrait() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
        }
    }

    /** Releases any orientation lock, letting the device follow its normal rotation behavior again. */
    @ReactMethod
    fun unlockOrientation() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    /**
     * Hides (or restores) the status/navigation bars for an edge-to-edge fullscreen video view.
     * Also extends content into the display cutout (notch/punch-hole camera) area — without this,
     * Android reserves a safe zone around it by default, which in landscape shows up as a black
     * bar down whichever side the cutout lands on.
     */
    @ReactMethod
    fun setImmersiveMode(enabled: Boolean) {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            val window = activity.window
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            if (enabled) {
                controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                WindowCompat.setDecorFitsSystemWindows(window, false)
                controller.hide(WindowInsetsCompat.Type.systemBars())
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    window.attributes = window.attributes.apply {
                        layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    }
                }
            } else {
                WindowCompat.setDecorFitsSystemWindows(window, true)
                controller.show(WindowInsetsCompat.Type.systemBars())
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    window.attributes = window.attributes.apply {
                        layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
                    }
                }
            }
        }
    }
}
