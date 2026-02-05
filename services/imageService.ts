import { ImageInsertResult } from '../types';

// This must match the domain/path configured in your Android WebViewAssetLoader
// Android Kotlin side should intercept requests to this path.
const ANDROID_VIRTUAL_DOMAIN = 'https://eulcauink.local';
const ANDROID_IMAGE_PATH = '/user-images/'; 

/**
 * ImageService abstracts the storage logic.
 * In a real Android WebView scenario, this would call window.Android.saveImage.
 * In this Web Demo, it uses Blob URLs.
 */
export const ImageService = {
  /**
   * Saves a base64 PNG string.
   * On Web: Creates a Blob URL.
   * On Android: Calls the native interface to save to disk and returns a virtual HTTPS URL.
   */
  saveBase64Image: async (base64Data: string): Promise<ImageInsertResult> => {
    const filename = `drawing_${Date.now()}.png`;

    // 1. Check if running inside the Android WebView wrapper
    if (window.Android && window.Android.saveImage) {
      try {
        // We expect the Android side to return the saved FILENAME (e.g. "drawing_123.png")
        // or a relative identifier, NOT the absolute file path.
        const savedFilename = window.Android.saveImage(base64Data, filename);
        
        // Construct a clean, virtual HTTPS URL.
        // The Android WebView must be configured to intercept this pattern.
        // Result: https://eulcauink.local/user-images/drawing_123.png
        const virtualUrl = `${ANDROID_VIRTUAL_DOMAIN}${ANDROID_IMAGE_PATH}${savedFilename}`;

        return {
          url: virtualUrl,
          filename: savedFilename
        };
      } catch (e) {
        console.error("Android bridge error:", e);
        throw new Error("Failed to save image via Android Bridge");
      }
    }

    // 2. Web Fallback (Blob URL)
    const res = await fetch(base64Data);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    return {
      url: objectUrl,
      filename: filename
    };
  }
};