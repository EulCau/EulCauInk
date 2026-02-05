export enum ViewMode {
  EDIT_ONLY = 'EDIT_ONLY',
  SPLIT = 'SPLIT',
  PREVIEW_ONLY = 'PREVIEW_ONLY'
}

export interface ImageInsertResult {
  url: string;   
  filename: string; 
}

export interface NoteItem {
  filename: string;
  title: string;
  updatedAt: number;
}

export interface AndroidInterface {
  // Image handling
  saveImage(base64Data: string, filename: string): string; 
  
  // Note handling
  // Returns a JSON string representing NoteItem[]
  getNoteList(): string; 
  // Returns the content of the file
  loadNote(filename: string): string;
  // Saves content to specific filename
  saveNote(filename: string, content: string): void;
  // Deletes a note
  deleteNote(filename: string): boolean;

  // System interactions
  showToast(message: string): void;
  openExternalLink(url: string): void;
}

declare global {
  interface Window {
    Android?: AndroidInterface;
  }
}