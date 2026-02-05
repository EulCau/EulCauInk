import { NoteItem } from '../types';

const ORDER_KEY = 'eulcauink_note_order';

export const NoteService = {
  getNotes: (): NoteItem[] => {
    let notes: NoteItem[] = [];

    if (window.Android && window.Android.getNoteList) {
      try {
        const json = window.Android.getNoteList();
        notes = JSON.parse(json);
      } catch (e) {
        console.error("Failed to parse note list from Android", e);
        notes = [];
      }
    } else {
      // Web Fallback: localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('note_')) {
          const filename = key.replace('note_', '');
          notes.push({
            filename: filename,
            title: filename.replace('.md', ''),
            updatedAt: Date.now() 
          });
        }
      }
    }

    // Apply locally saved sort order
    try {
      const savedOrder = localStorage.getItem(ORDER_KEY);
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder) as string[];
        const orderMap = new Map<string, number>(parsedOrder.map((filename, index) => [filename, index]));
        notes.sort((a, b) => {
          const indexA = orderMap.get(a.filename) ?? 9999;
          const indexB = orderMap.get(b.filename) ?? 9999;
          return indexA - indexB;
        });
      }
    } catch (e) {
      console.warn("Failed to load sort order", e);
    }

    return notes;
  },

  loadNote: (filename: string): string => {
    if (window.Android && window.Android.loadNote) {
      return window.Android.loadNote(filename);
    } else {
      // Web Fallback
      return localStorage.getItem(`note_${filename}`) || '';
    }
  },

  saveNote: (filename: string, content: string): void => {
    if (window.Android && window.Android.saveNote) {
      window.Android.saveNote(filename, content);
      window.Android.showToast(`Saved: ${filename}`);
    } else {
      // Web Fallback
      localStorage.setItem(`note_${filename}`, content);
      console.log(`Saved to localStorage: ${filename}`);
    }
  },

  deleteNote: (filename: string): boolean => {
    if (window.Android && window.Android.deleteNote) {
      const success = window.Android.deleteNote(filename);
      if (success) {
        window.Android.showToast(`Deleted: ${filename}`);
        return true;
      }
      return false;
    } else {
      // Web Fallback
      localStorage.removeItem(`note_${filename}`);
      
      // Cleanup order
      try {
        const savedOrderStr = localStorage.getItem(ORDER_KEY);
        if (savedOrderStr) {
          const savedOrder = JSON.parse(savedOrderStr) as string[];
          const newOrder = savedOrder.filter(f => f !== filename);
          localStorage.setItem(ORDER_KEY, JSON.stringify(newOrder));
        }
      } catch (e) { /* ignore */ }

      return true;
    }
  },

  saveNoteOrder: (filenames: string[]) => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(filenames));
  }
};
