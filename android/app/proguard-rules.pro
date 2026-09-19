# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Archive libraries (net.lingala.zip4j, commons-compress + xz, junrar) are plain Java libs with
# no bundled AAR consumer-rules and some codec lookup relies on reflection — keep them whole to
# avoid ClassNotFoundException/NoSuchMethodError in release builds (ArchiveModule.kt).
-keep class net.lingala.zip4j.** { *; }
-keep class org.apache.commons.compress.** { *; }
-keep class org.tukaani.xz.** { *; }
-keep class com.github.junrar.** { *; }
-dontwarn net.lingala.zip4j.**
-dontwarn org.apache.commons.compress.**
-dontwarn org.tukaani.xz.**
-dontwarn com.github.junrar.**

# commons-compress optionally logs via SLF4J; no binding is bundled, which is fine (SLF4J
# no-ops at runtime without one) but R8 needs to be told not to treat it as a hard error.
-dontwarn org.slf4j.**
