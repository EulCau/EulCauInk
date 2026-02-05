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
  readOnly?: boolean;
  onNavigate?: (target: string) => void; // New prop for internal navigation
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  content, 
  onChange, 
  viewMode, 
  editorRef,
  readOnly = false,
  onNavigate
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
    const anchor = target.closest('a');
    
    if (anchor) {
      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;

      // STOP WebView from standard navigation behavior
      e.preventDefault(); 
      e.stopPropagation();

      const href = rawHref.trim();

      // 1. External Links (http/https)
      if (/^https?:\/\//i.test(href)) {
        if (window.Android && window.Android.openExternalLink) {
          window.Android.openExternalLink(href);
        } else {
          // Web fallback
          window.open(href, '_blank');
        }
        return;
      }

      // 2. Anchor Links (#section)
      if (href.startsWith('#')) {
        try {
          // Decode URI to support Chinese/Special characters (e.g., #%E4%BD%A0%E5%A5%BD -> #你好)
          const id = decodeURIComponent(href.substring(1));
          
          // Try exact match first
          let element = document.getElementById(id);
          
          // Fallback: Try slugified version if exact match fails (rehype-slug usually lowercases and hyphenates)
          if (!element) {
             const slugId = id.toLowerCase().replace(/\s+/g, '-');
             element = document.getElementById(slugId);
          }

          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch (err) {
          console.warn("Anchor navigation failed", err);
        }
        return;
      }

      // 3. Internal Note Links (file.md)
      // If it looks like a relative file link, try to navigate internally
      if (onNavigate) {
         onNavigate(href);
      }
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
            readOnly={readOnly}
            editable={!readOnly}
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