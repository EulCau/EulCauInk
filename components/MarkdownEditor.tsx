import React from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import { ViewMode } from '../types';

interface MarkdownEditorProps {
  content: string;
  onChange: (val: string) => void;
  viewMode: ViewMode;
  editorRef: React.RefObject<ReactCodeMirrorRef>;
  readOnly?: boolean; // New prop to disable editor
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  content, 
  onChange, 
  viewMode, 
  editorRef,
  readOnly = false
}) => {

  // Editor Extensions
  const extensions = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    EditorView.theme({
        "&": { height: "100%" },
        ".cm-scroller": { fontFamily: "'Fira Code', 'Roboto Mono', monospace" }
    })
  ];

  const showEditor = viewMode === ViewMode.EDIT_ONLY || viewMode === ViewMode.SPLIT;
  const showPreview = viewMode === ViewMode.PREVIEW_ONLY || viewMode === ViewMode.SPLIT;

  // Handle all link clicks in preview
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Check if the clicked element is an anchor tag or inside one
    const anchor = target.closest('a');
    
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (!href) return;

      e.preventDefault(); // STOP WebView from navigating

      if (href.startsWith('#')) {
        // --- 1. Internal Anchor (#header) ---
        const id = href.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        // --- 2. External Link (http...) ---
        if (window.Android && window.Android.openExternalLink) {
          window.Android.openExternalLink(href);
        } else {
          // Web fallback: open in new tab
          window.open(href, '_blank');
        }
      }
      // Note: We ignore other protocols or relative paths for now to prevent crashes
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Editor Pane */}
      {showEditor && (
        <div className={`h-full overflow-hidden ${viewMode === ViewMode.SPLIT ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
          <CodeMirror
            ref={editorRef}
            value={content}
            height="100%"
            extensions={extensions}
            onChange={onChange}
            readOnly={readOnly} // Disables input when drawing
            editable={!readOnly} // Ensures contenteditable is false on DOM
            theme="light"
            className="h-full text-base"
            basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                defaultKeymap: true,
                searchKeymap: true,
                historyKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
            }}
          />
        </div>
      )}

      {/* Preview Pane */}
      {showPreview && (
        <div 
            onClick={handlePreviewClick}
            className={`h-full overflow-y-auto bg-white p-8 prose prose-slate max-w-none ${viewMode === ViewMode.SPLIT ? 'w-1/2' : 'w-full'}`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeSlug]}
            components={{
              // Custom image renderer to ensure styled rendering
              img: ({node, ...props}) => (
                <span className="block my-4 text-center">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img {...props} className="max-h-[500px] mx-auto rounded shadow-sm border border-gray-100" />
                </span>
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};