package com.filemanager.app.filemanager

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class FileManagerPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(
            FileSystemModule(reactContext),
            FileOperationsModule(reactContext),
            MediaCategoryModule(reactContext),
            SearchModule(reactContext),
            DuplicateFinderModule(reactContext),
            ArchiveModule(reactContext),
            ApkModule(reactContext),
            ShareModule(reactContext),
            StorageAnalyzerModule(reactContext),
            ThemeModule(reactContext),
        )

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
