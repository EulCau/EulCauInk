# EulCauInk - Web & Android Hybrid Notebook

## Project Overview

This is a pure frontend React application designed to run inside an Android `WebView`. It features a CodeMirror markdown editor, a note list manager, and stylus handwriting support.

## 🛠 Web Development

1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`

## 📦 How to Package for Android

1. Run the install command:

    ```bash
    npm install react react-dom lucide-react rehype-katex rehype-slug remark-math remark-gfm react-markdown @codemirror/view @uiw/react-codemirror @codemirror/lang-markdown @codemirror/language-data katex clsx tailwind-merge
    npm install -D tailwindcss@3.4.17 postcss autoprefixer @tailwindcss/typography
    npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
    ```

2. Run the build command:

    ```bash
    npm run build
    ```

    This generates the static files in the `dist/` folder.
3. Copy the **contents** of the `dist/` folder into your Android project's assets folder:
    `src/main/assets/`
4. Ensure your WebView loads `file:///android_asset/index.html` or uses the `WebViewAssetLoader` method described below (recommended).

## 📱 Android Integration Guide

### 1. Dependencies (build.gradle)

```groovy
implementation "androidx.webkit:webkit:1.9.0"
implementation "com.google.code.gson:gson:2.10.1" // Recommended for JSON handling
```

### 2. The Bridge (Java/Kotlin)

You must implement the `deleteNote` method in addition to existing ones.

```java
public class WebAppInterface {
    Context mContext;

    WebAppInterface(Context c) {
        mContext = c;
    }

    // --- Image Handling ---
    @JavascriptInterface
    public String saveImage(String base64Data, String filename) {
        // ... (Existing image saving logic) ...
        return filename; 
    }

    // --- Note Handling ---

    @JavascriptInterface
    public String getNoteList() {
        // Return a JSON array of files in the folder
        File directory = mContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS); // Or custom folder
        if (!directory.exists()) directory.mkdirs();
        
        File[] files = directory.listFiles((dir, name) -> name.endsWith(".md"));
        
        // Manual JSON construction or use Gson
        StringBuilder json = new StringBuilder("[");
        if (files != null) {
            for (int i = 0; i < files.length; i++) {
                 // Simple JSON object: {"filename": "abc.md", "title": "abc", "updatedAt": 123}
                json.append(String.format("{\"filename\":\"%s\", \"title\":\"%s\", \"updatedAt\": %d}", 
                    files[i].getName(), 
                    files[i].getName().replace(".md", ""),
                    files[i].lastModified()
                ));
                if (i < files.length - 1) json.append(",");
            }
        }
        json.append("]");
        return json.toString();
    }

    @JavascriptInterface
    public String loadNote(String filename) {
        File directory = mContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
        File file = new File(directory, filename);
        StringBuilder text = new StringBuilder();
        try {
            BufferedReader br = new BufferedReader(new FileReader(file));
            String line;
            while ((line = br.readLine()) != null) {
                text.append(line).append('\n');
            }
            br.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
        return text.toString();
    }

    @JavascriptInterface
    public void saveNote(String filename, String content) {
        File directory = mContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
        if (!directory.exists()) directory.mkdirs();
        File file = new File(directory, filename);
        
        try {
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(content.getBytes());
            fos.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @JavascriptInterface
    public boolean deleteNote(String filename) {
        File directory = mContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
        File file = new File(directory, filename);
        if (file.exists()) {
            return file.delete();
        }
        return false;
    }

    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }
}
```

### 3. WebView Setup

Keep the existing `WebViewAssetLoader` setup but ensure your Android code handles both Image storage (e.g., `DIRECTORY_PICTURES`) and Document storage (e.g., `DIRECTORY_DOCUMENTS`) if you want to keep them separate, or put them in the same folder.

## ✍️ Handwriting Logic

The Canvas component strictly listens to `pointerType === 'pen'` for native-like palm rejection.
