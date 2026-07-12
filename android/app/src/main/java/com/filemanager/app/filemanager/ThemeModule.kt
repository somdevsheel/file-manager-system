package com.filemanager.app.filemanager

import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

/**
 * Reads Android 12+ "Material You" dynamic color resources (system_accent1/2/3, system_neutral1/2),
 * which the OS derives from the user's wallpaper. These are public resources on API 31+, no
 * permission required. We expose the raw tonal steps and let the JS theme builder map them onto
 * MD3 color roles, so the mapping logic lives in one place (src/presentation/theme/materialYou.ts).
 */
class ThemeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ThemeInfo"

    private val tonalSteps = listOf(0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000)

    @ReactMethod
    fun isDynamicColorAvailable(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
    }

    @ReactMethod
    fun getDynamicColorPalette(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(null)
            return
        }
        try {
            val result: WritableMap = Arguments.createMap()
            for (family in listOf("accent1", "accent2", "accent3", "neutral1", "neutral2")) {
                val familyMap: WritableMap = Arguments.createMap()
                for (step in tonalSteps) {
                    val resName = "system_${family}_$step"
                    val resId = reactApplicationContext.resources.getIdentifier(resName, "color", "android")
                    if (resId != 0) {
                        val color = reactApplicationContext.getColor(resId)
                        familyMap.putString(step.toString(), String.format("#%06X", 0xFFFFFF and color))
                    }
                }
                result.putMap(family, familyMap)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }
}
