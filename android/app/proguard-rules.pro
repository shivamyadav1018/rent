# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# PDFBox supports optional JPEG-2000 decoding when Gemalto's decoder is present.
# Rent Khata does not use that optional format.
-dontwarn com.gemalto.jp2.JP2Decoder
