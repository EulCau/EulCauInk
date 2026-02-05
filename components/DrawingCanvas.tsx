import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pen, Eraser, Check, X, Undo, Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  onSave: (base64Data: string) => void;
  onCancel: () => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  
  // Context state for undo functionality (simple implementation)
  const [history, setHistory] = useState<ImageData[]>([]);
  
  // Configuration
  const LINE_WIDTH_BASE = 3;
  
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  }, []);

  // Initialize Canvas with high DPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const { width, height } = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Set default background to white (opaque) for export
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Reset styles after resize
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial snapshot for undo
    setTimeout(() => {
        saveHistoryState();
    }, 100);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveHistoryState = () => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(-19), imageData]); // Keep last 20 states
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const ctx = getContext();
    if (!ctx) return;
    
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  };

  const handleClear = () => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    // Fill white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Use actual width/height for fill
    saveHistoryState();
  };

  // --- Drawing Logic ---

  const lastPos = useRef<{ x: number, y: number } | null>(null);

  const startDrawing = (e: React.PointerEvent) => {
    // STRICT REQUIREMENT: Only accept Pen input
    if (e.pointerType !== 'pen') return;
    
    e.preventDefault(); // Prevent scrolling
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    lastPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Start a new path (logic handled in move)
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || e.pointerType !== 'pen' || !lastPos.current) return;
    e.preventDefault();

    const ctx = getContext();
    if (!ctx) return;
    const canvas = canvasRef.current;
    if(!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Pressure sensitivity
    // Fallback to 0.5 if hardware doesn't support pressure
    const pressure = e.pressure === 0 ? 0.5 : e.pressure; 
    
    ctx.lineWidth = LINE_WIDTH_BASE * pressure;
    ctx.strokeStyle = strokeColor;
    
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastPos.current = { x: currentX, y: currentY };
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (e.pointerType !== 'pen') return;
    if (isDrawing) {
      setIsDrawing(false);
      lastPos.current = null;
      saveHistoryState();
    }
  };

  const handleFinish = () => {
    if (!canvasRef.current) return;
    // export as PNG
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onCancel} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
          <span className="font-semibold text-gray-700 select-none">Freehand Drawing (Pen Only)</span>
        </div>

        <div className="flex items-center space-x-2">
           {/* Color Picker */}
           <div className="flex space-x-1 mr-4">
            {['#000000', '#D32F2F', '#1976D2', '#388E3C'].map(c => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${strokeColor === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          
          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <button onClick={handleUndo} disabled={history.length <= 1} className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30">
            <Undo size={20} />
          </button>
          <button onClick={handleClear} className="p-2 text-gray-600 hover:bg-gray-100 rounded">
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-2">
           <button 
             onClick={handleFinish}
             className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
           >
             <Check size={20} className="mr-2" />
             Insert
           </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden bg-gray-200 touch-none">
        <div className="absolute inset-4 bg-white shadow-md rounded-lg overflow-hidden">
             <canvas
              ref={canvasRef}
              className="w-full h-full touch-none block"
              style={{ touchAction: 'none' }} 
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              onPointerCancel={stopDrawing}
            />
            {/* Instruction Overlay (fades out if needed, or stays static) */}
            <div className="absolute bottom-2 left-4 pointer-events-none text-xs text-gray-400 select-none">
              Stylus Input Only
            </div>
        </div>
      </div>
    </div>
  );
};