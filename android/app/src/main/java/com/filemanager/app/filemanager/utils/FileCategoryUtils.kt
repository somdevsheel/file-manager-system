package com.filemanager.app.filemanager.utils

/**
 * Extension -> category mapping. Mirrors src/utils/fileCategory.ts on the JS side.
 * Kept in sync manually since native modules and JS run in separate runtimes.
 */
object FileCategoryUtils {

    private val IMAGE = setOf("jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "heif", "svg", "tiff", "tif", "ico")
    private val VIDEO = setOf("mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "3gp", "3gpp", "mpeg", "mpg", "ts")
    private val AUDIO = setOf("mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus", "amr", "mid", "midi")
    private val PDF = setOf("pdf")
    private val WORD = setOf("doc", "docx", "dot", "dotx", "odt")
    private val EXCEL = setOf("xls", "xlsx", "xlsm", "csv", "ods")
    private val POWERPOINT = setOf("ppt", "pptx", "pps", "ppsx", "odp")
    private val ZIP = setOf("zip")
    private val RAR = setOf("rar")
    private val SEVEN_ZIP = setOf("7z")
    private val APK = setOf("apk", "xapk", "apks")
    private val JSON = setOf("json")
    private val XML = setOf("xml", "html", "htm")
    private val TEXT = setOf("txt", "md", "log", "ini", "cfg", "conf", "yaml", "yml", "rtf")
    private val CODE = setOf(
        "java", "kt", "kts", "js", "jsx", "ts", "tsx", "py", "c", "cpp", "cc", "h", "hpp",
        "cs", "go", "rs", "rb", "php", "swift", "sh", "gradle", "dart", "lua", "sql", "pl", "r"
    )
    private val DOCUMENT = setOf("epub", "djvu", "pages", "mobi", "azw", "azw3")

    fun categoryFor(extension: String, isDirectory: Boolean): String {
        if (isDirectory) return "folder"
        val ext = extension.lowercase()
        return when {
            ext in IMAGE -> "image"
            ext in VIDEO -> "video"
            ext in AUDIO -> "audio"
            ext in PDF -> "pdf"
            ext in WORD -> "word"
            ext in EXCEL -> "excel"
            ext in POWERPOINT -> "powerpoint"
            ext in ZIP -> "zip"
            ext in RAR -> "rar"
            ext in SEVEN_ZIP -> "sevenZip"
            ext in APK -> "apk"
            ext in JSON -> "json"
            ext in XML -> "xml"
            ext in CODE -> "code"
            ext in TEXT -> "text"
            ext in DOCUMENT -> "document"
            else -> "unknown"
        }
    }

    val ARCHIVE_EXTENSIONS = ZIP + RAR + SEVEN_ZIP

    fun extensionsForCategory(category: String): Set<String> = when (category) {
        "image" -> IMAGE
        "video" -> VIDEO
        "audio" -> AUDIO
        "pdf" -> PDF
        "word" -> WORD
        "excel" -> EXCEL
        "powerpoint" -> POWERPOINT
        "zip" -> ZIP
        "rar" -> RAR
        "sevenZip" -> SEVEN_ZIP
        "apk" -> APK
        "json" -> JSON
        "xml" -> XML
        "code" -> CODE
        "text" -> TEXT
        "document" -> DOCUMENT
        else -> emptySet()
    }
}
