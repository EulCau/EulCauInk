import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { PenTool, Layout, Columns, Eye, ChevronLeft, Save } from 'lucide-react';
import { MarkdownEditor } from './components/MarkdownEditor';
import { DrawingCanvas } from './components/DrawingCanvas';
import { NoteList } from './components/NoteList';
import { ImageService } from './services/imageService';
import { NoteService } from './services/noteService';
import { ViewMode, NoteItem } from './types';

// New note template
const NEW_NOTE_TEMPLATE = `# Untitled

Start writing here...
`;

const App: React.FC = () => {
  // Navigation State
  const [screen, setScreen] = useState<'LIST' | 'EDITOR'>('LIST');
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);

  // Editor State
  const [content, setContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [isDrawing, setIsDrawing] = useState(false);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Load Notes on Mount or when returning to list
  useEffect(() => {
    if (screen === 'LIST') {
      const loadedNotes = NoteService.getNotes();
      setNotes(loadedNotes);
    }
  }, [screen]);

  // When drawing starts, blur inputs
  useEffect(() => {
    if (isDrawing && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isDrawing]);

  // --- Navigation Handlers ---

  const handleCreateNote = () => {
    setContent(NEW_NOTE_TEMPLATE);
    setCurrentFilename(null); // Null means it's a new file not yet saved to disk
    setScreen('EDITOR');
  };

  const handleSelectNote = (filename: string) => {
    const loadedContent = NoteService.loadNote(filename);
    setContent(loadedContent);
    setCurrentFilename(filename);
    setScreen('EDITOR');
  };

  const handleDeleteNote = (filename: string) => {
    const success = NoteService.deleteNote(filename);
    if (success) {
        setNotes(prev => prev.filter(n => n.filename !== filename));
    }
  };

  const handleReorderNotes = (newNotes: NoteItem[]) => {
    setNotes(newNotes);
    // Persist order
    const filenames = newNotes.map(n => n.filename);
    NoteService.saveNoteOrder(filenames);
  };

  const handleBackToList = () => {
    // Optional: Auto-save or prompt could go here. 
    // For now, we rely on manual save to be explicit.
    setScreen('LIST');
  };

  // --- Editor Handlers ---

  const handleSaveNote = () => {
    // 1. Extract Title from content (First line starting with # )
    let newFilename = currentFilename;
    
    // Simple regex to find the first top-level header
    const titleMatch = content.match(/^#\s+(.+)$/m);
    
    if (titleMatch && titleMatch[1]) {
      // Sanitize filename
      const safeTitle = titleMatch[1].replace(/[<>:"/\\|?*]/g, '').trim();
      if (safeTitle) {
        newFilename = `${safeTitle}.md`;
      }
    }

    // Fallback if no title found and no previous filename
    if (!newFilename) {
      newFilename = `Untitled_${Date.now()}.md`;
    }

    // 2. Save
    NoteService.saveNote(newFilename, content);
    setCurrentFilename(newFilename);
  };

  const handleDrawingSave = useCallback(async (base64Data: string) => {
    try {
      const { url } = await ImageService.saveBase64Image(base64Data);
      const markdownImage = `\n![Handwriting](${url})\n`;

      if (editorRef.current && editorRef.current.view) {
        const view = editorRef.current.view;
        const cursor = view.state.selection.main.head;
        view.dispatch({
          changes: { from: cursor, insert: markdownImage },
          selection: { anchor: cursor + markdownImage.length }
        });
      } else {
        setContent(prev => prev + markdownImage);
      }
      setIsDrawing(false);
    } catch (err) {
      console.error("Failed to save drawing", err);
      alert("Error saving drawing.");
    }
  }, []);

  // --- RENDER ---

  if (screen === 'LIST') {
    return (
      <NoteList 
        notes={notes} 
        onCreateNote={handleCreateNote} 
        onSelectNote={handleSelectNote} 
        onDeleteNote={handleDeleteNote}
        onReorderNotes={handleReorderNotes}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Editor Navbar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10">
        <div className="flex items-center space-x-2">
            <button 
              onClick={handleBackToList}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Back to List"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-sm font-bold text-gray-700 truncate max-w-[150px] sm:max-w-xs">
              {currentFilename || "Unsaved Note"}
            </h1>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-3">
            {/* View Mode Switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1 hidden sm:flex">
                <button 
                    onClick={() => setViewMode(ViewMode.EDIT_ONLY)}
                    className={`p-1.5 rounded-md transition-all ${viewMode === ViewMode.EDIT_ONLY ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Layout size={18} />
                </button>
                <button 
                    onClick={() => setViewMode(ViewMode.SPLIT)}
                    className={`p-1.5 rounded-md transition-all ${viewMode === ViewMode.SPLIT ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Columns size={18} />
                </button>
                <button 
                    onClick={() => setViewMode(ViewMode.PREVIEW_ONLY)}
                    className={`p-1.5 rounded-md transition-all ${viewMode === ViewMode.PREVIEW_ONLY ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Eye size={18} />
                </button>
            </div>

            <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>

            <button 
                onClick={() => setIsDrawing(true)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-full"
                title="Insert Drawing"
            >
                <PenTool size={20} />
            </button>

            <button
                onClick={handleSaveNote}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                title="Save Note"
            >
                <Save size={18} />
                <span className="hidden sm:inline font-medium">Save</span>
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <MarkdownEditor 
            content={content} 
            onChange={setContent} 
            viewMode={viewMode}
            editorRef={editorRef}
            readOnly={isDrawing}
        />
      </main>

      {/* Drawing Modal */}
      {isDrawing && (
        <DrawingCanvas 
            onSave={handleDrawingSave} 
            onCancel={() => setIsDrawing(false)} 
        />
      )}
    </div>
  );
};

export default App;