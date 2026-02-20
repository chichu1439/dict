import { useState, useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window'
import { useSettingsStore } from '../stores/settingsStore'

interface MonitorInfo {
    x: number;
    y: number;
    w: number;
    h: number;
    name: string;
}

export default function ScreenshotTranslation() {
  const [isActive, setIsActive] = useState(false) // Control whether component is active
  const [isSelecting, setIsSelecting] = useState(false)
  const [hasStartedSelection, setHasStartedSelection] = useState(false) // Track if user has actually started dragging
  const [isProcessing, setIsProcessing] = useState(false) // New: Track processing state
  const [screenshotImage, setScreenshotImage] = useState('')
  // We removed local image storage, we will rely on backend to capture
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  // Removed preCaptureStateRef as it's no longer needed for overlay window
  const monitorRef = useRef<MonitorInfo | null>(null)

  const { ocrLanguage, ocrMode, ocrEnhance, ocrLimitMaxSize, ocrMaxDimension, ocrShowResult } = useSettingsStore()

  const safeWindowCall = useCallback(async (label: string, action: () => Promise<void>) => {
    try {
      await action()
    } catch (error) {
      console.error(`Window action failed: ${label}`, error)
      window.dispatchEvent(new CustomEvent('debug-log', { detail: `Window action failed: ${label} -> ${String(error)}` }))
    }
  }, [])

  const getOcrLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'zh':
        return 'Chinese'
      case 'en':
        return 'English'
      case 'ja':
        return 'Japanese'
      case 'ko':
        return 'Korean'
      default:
        return 'Auto'
    }
  }

  const startSelection = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    // Only start selection if we're in selecting mode and haven't started yet
    if (isSelecting && !hasStartedSelection) {
      const pos = { x: e.clientX, y: e.clientY };
      setHasStartedSelection(true)
      setStartPos(pos)
      setCurrentPos(pos)
      // Log selection start for debug
      console.log('Selection started:', pos.x, pos.y)
      window.dispatchEvent(new CustomEvent('debug-log', { detail: `Selection started at: ${pos.x}, ${pos.y}` }));
    }
  }, [isSelecting, hasStartedSelection])

  const updateSelection = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return
    e.preventDefault()
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }, [isSelecting])

  const cropImage = async (base64: string, x: number, y: number, w: number, h: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        
        // Ensure valid dimensions
        const safeW = Math.max(1, w * dpr);
        const safeH = Math.max(1, h * dpr);
        
        canvas.width = safeW;
        canvas.height = safeH;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        
        // Draw the slice of the original image onto the canvas
        // The original image is full screen size (screen.width * dpr)
        // x, y, w, h are in CSS pixels, so we scale them by dpr to find source coordinates
        ctx.drawImage(img, x * dpr, y * dpr, safeW, safeH, 0, 0, safeW, safeH);
        
        // Removed filter - let the preprocess stage handle any necessary enhancements
        // This ensures cropImage just returns the raw cropped data
        // ctx.filter = 'contrast(1.2) brightness(1.05) grayscale(1)';
        // ctx.drawImage(canvas, 0, 0);
        // ctx.filter = 'none';

        const data = canvas.toDataURL('image/png');
        resolve(data.split(',')[1]);
      };
      img.onerror = reject;
      img.src = `data:image/bmp;base64,${base64}`;
    });
  }

  const preprocessImage = async (base64Png: string, options: { enhance: boolean; mode: 'accuracy' | 'speed'; limitMaxSize: boolean; maxDimension: number }): Promise<string> => {
    // If enhancement is disabled and no resizing needed, return original immediately
    if (!options.enhance && !options.limitMaxSize) {
       return base64Png;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = Math.max(img.width, img.height);
        let scaleFactor = 1;

        // Only scale down if significantly larger than needed
        if (options.limitMaxSize && options.maxDimension > 0 && maxDim > options.maxDimension) {
          scaleFactor = options.maxDimension / maxDim;
        } 
        // Restore upscaling for small images to improve OCR accuracy
        // Tesseract prefers ~300 DPI, screen is usually 96 DPI. So 2x-3x scaling helps small text.
        else if (options.mode === 'accuracy' && maxDim < 1000) {
           // Scale up small images, but cap at reasonable size
           scaleFactor = Math.min(2.5, 2000 / maxDim);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scaleFactor));
        canvas.height = Math.max(1, Math.round(img.height * scaleFactor));

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        // Use high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (options.enhance) {
          // Apply gentle enhancement
          // For screen text, we want to increase contrast but avoid aggressive binarization that merges strokes
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Grayscale
            let v = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Gentle Contrast stretching
            // Less aggressive than before to preserve anti-aliasing details
            v = (v - 128) * 1.5 + 128; 
            
            // Clamp
            v = Math.max(0, Math.min(255, v));

            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        const out = canvas.toDataURL('image/png');
        resolve(out.split(',')[1]);
      };
      img.onerror = reject;
      img.src = `data:image/png;base64,${base64Png}`;
    });
  }

  const endSelection = useCallback(async (e: React.MouseEvent) => {
    // Must check hasStartedSelection to avoid accidental triggers
    if (!isSelecting || isProcessing || !hasStartedSelection) return
    e.preventDefault()

    const width = Math.abs(e.clientX - startPos.x)
    const height = Math.abs(e.clientY - startPos.y)

    console.log('Selection ended:', width, height)
    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Selection ended: width=${width}, height=${height}, start=(${startPos.x}, ${startPos.y}), end=(${e.clientX}, ${e.clientY})` }));

    if (width < 10 || height < 10) {
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Selection too small, cancelling' }));
      
      // Don't show notification for tiny clicks/mistakes, just reset selection
      // Only show if it was clearly an attempt (e.g. > 2px but < 10px)
      if (width > 2 && height > 2) {
        const event = new CustomEvent('show-notification', {
          detail: {
            type: 'warning',
            title: 'Selection too small',
            message: 'Please select a larger area for accurate OCR.'
          }
        });
        window.dispatchEvent(event);
      }
      
      // Just reset the selection state, don't close the window!
      // User might want to try again.
      setHasStartedSelection(false)
      // restoreWindow() // Removed: Don't close window on small selection
      return
    }

    // Don't close selection UI immediately, show processing state
    setIsProcessing(true)
    
    // Calculate selection coordinates (CSS pixels)
    const x = Math.min(startPos.x, e.clientX)
    const y = Math.min(startPos.y, e.clientY)

    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Processing capture at (${x}, ${y}) size ${width}x${height}` }));

    try {
      await processCapture(x, y, width, height)
    } catch (error) {
      console.error('Process capture failed:', error)
      setIsProcessing(false) // Reset on error if not handled inside
      // If error, let user try again
      setHasStartedSelection(false)
    }
    
    // Restore window handled in processCapture finally block ONLY on success or critical failure
  }, [isSelecting, startPos, isProcessing, hasStartedSelection])

  const cancelSelection = useCallback(async () => {
    if (isProcessing) return // Prevent cancel during processing
    setIsSelecting(false)
    setHasStartedSelection(false)
    setScreenshotImage('')
    setIsActive(false) // Deactivate component
    await restoreWindow()
  }, [isProcessing])

  const captureMonitorImage = useCallback(async (monitor: MonitorInfo) => {
    const base64 = await invoke<string>('capture_screen', {
      x: Math.round(monitor.x),
      y: Math.round(monitor.y),
      w: Math.round(monitor.w),
      h: Math.round(monitor.h)
    })
    setScreenshotImage(base64)
    return base64
  }, [])

  const showErrorNotification = (message: string) => {
    const event = new CustomEvent('show-notification', {
      detail: {
        type: 'error',
        title: 'OCR Failed',
        message,
      },
    })
    window.dispatchEvent(event)
  }

  const processCapture = async (x: number, y: number, w: number, h: number) => {
    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Processing capture: ${x},${y} ${w}x${h} (CSS Pixels)` }));

    try {
      const appWindow = getCurrentWindow();
      const monitor = monitorRef.current;
      if (!monitor) {
        throw new Error('Monitor info not available');
      }

      // Hide overlay before capturing to avoid capturing our own UI
      await appWindow.hide();
      // Wait a bit for window to disappear completely
      await new Promise(r => setTimeout(r, 50));

      // Calculate physical coordinates based on monitor position and DPI
      // monitor.x/y are in physical pixels (from GetMonitorInfoW)
      // x, y, w, h are in CSS pixels relative to the overlay window (which is positioned at monitor.x, monitor.y)
      // The overlay window size is set to monitor.w, monitor.h (physical pixels?)
      // Wait, setSize takes PhysicalSize. So overlay size matches monitor physical size.
      // But React renders in CSS pixels.
      // If monitor is high-DPI, 1 CSS pixel = dpr Physical pixels.
      
      const dpr = window.devicePixelRatio || 1;
      
      // Calculate absolute screen coordinates for capture
      // The overlay is positioned at monitor.x, monitor.y (Physical)
      // But the content inside is relative to window client area.
      // x, y are client coordinates (CSS pixels).
      
      // Physical coordinates relative to monitor origin:
      const physRelX = Math.round(x * dpr);
      const physRelY = Math.round(y * dpr);
      const physW = Math.round(w * dpr);
      const physH = Math.round(h * dpr);
      
      // Absolute screen coordinates:
      const absX = monitor.x + physRelX;
      const absY = monitor.y + physRelY;

      window.dispatchEvent(new CustomEvent('debug-log', { detail: `Capturing absolute rect: ${absX},${absY} ${physW}x${physH} (Physical) Lang: ${ocrLanguage}` }));

      // Call backend to capture and OCR directly
      // This is the native way: let backend handle the heavy lifting
      const ocrResult = await invoke<{ text: string, confidence: number }>('capture_and_ocr', {
        x: absX,
        y: absY,
        w: physW,
        h: physH,
        language: ocrLanguage // Make sure language is passed correctly. e.g. "zh" or "zh-Hans" or "auto"
      });

      // Show window again if we want to show result locally (not implemented)
      // But typically we just close overlay after capture
      // await appWindow.show(); 

      window.dispatchEvent(new CustomEvent('debug-log', { detail: `OCR Result: ${ocrResult.text.substring(0, 30)}...` }));

      if (ocrResult.text && ocrResult.text.trim()) {
        const info = { confidence: ocrResult.confidence, language: getOcrLanguageLabel(ocrLanguage) }
        const payload = { text: ocrResult.text, ocrInfo: info, autoShow: ocrShowResult }
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `OCR Success: ${ocrResult.text.substring(0, 30)}...` }));
        
        // Dispatch to main window via backend
        try {
            await invoke('emit_to_main', { event: 'request-translation', payload: JSON.stringify(payload) });
        } catch (err) {
            console.error('Failed to emit to main window', err);
            window.dispatchEvent(new CustomEvent('debug-log', { detail: `Failed to emit to main: ${String(err)}` }));
        }

        if (!ocrShowResult) {
          window.dispatchEvent(new CustomEvent('debug-log', { detail: 'OCR result processed silently (show result disabled).' }));
        }
      } else {
        showErrorNotification('No text detected in the selected area.')
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'No text detected' }));
      }
    } catch (error) {
      console.error('Screenshot translation error:', error)
      let userFriendlyMsg = 'An error occurred during processing.';
      const errorStr = String(error);
      if (errorStr.includes('OCR') && errorStr.includes('No text')) {
        userFriendlyMsg = 'No text detected. Please select a clearer text area.';
      } else if (errorStr.includes('network') || errorStr.includes('Network')) {
        userFriendlyMsg = 'Network error. Please check your connection and try again.';
      } else if (errorStr.includes('API') || errorStr.includes('api')) {
        userFriendlyMsg = 'Translation service is unavailable. Please try again later.';
      } else if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
        userFriendlyMsg = 'Timed out. Try selecting a smaller area.';
      } else if (errorStr.includes('empty') || errorStr.includes('Empty')) {
        userFriendlyMsg = 'No valid text detected. Please select again.';
      }
      window.dispatchEvent(new CustomEvent('debug-log', { detail: `Error: ${errorStr} -> User message: ${userFriendlyMsg}` }));
      showErrorNotification(userFriendlyMsg)
    } finally {
      setIsProcessing(false) // Ensure processing state is cleared
      await restoreWindow()
    }
  }

  const setupWindowForCapture = async (width: number, height: number) => {
    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Setting up window: ${width}x${height}` }));
    
    // Set window size first to match monitor
    // Note: setSize takes physical pixels if using PhysicalSize
    const appWindow = getCurrentWindow();
    await safeWindowCall('setSize', () => appWindow.setSize(new PhysicalSize(width, height)));
    
    // Ensure window is frameless and transparent
    await safeWindowCall('setDecorations', () => appWindow.setDecorations(false));
    
    // Important: On Windows, sometimes transparency fails if not explicitly set
    // But tauri.conf.json handles the initial state.
    
    // Always on top
    await safeWindowCall('setAlwaysOnTop', () => appWindow.setAlwaysOnTop(true));
    
    // Make sure we are not maximized (which might break transparency on some systems)
    await safeWindowCall('unmaximize', () => appWindow.unmaximize());
    
    // Set shadow false (shadow can sometimes cause white border artifacts)
    await safeWindowCall('setShadow', () => appWindow.setShadow(false));
  }

  const restoreWindow = useCallback(async () => {
    const appWindow = getCurrentWindow()
    // Just hide the overlay window
    await safeWindowCall('hide', () => appWindow.hide())

    window.dispatchEvent(new CustomEvent('ocr-capture-active', { detail: false }))
    
    // Clear hotkey processing flag when done
    try {
      await invoke('clear_hotkey_processing');
    } catch (error) {
      console.error('Failed to clear hotkey processing:', error);
    }
    
    // Deactivate component when restoring window
    setIsActive(false);
    setIsSelecting(false); // Reset selection state
    setHasStartedSelection(false);
    setIsProcessing(false);
    setScreenshotImage('');
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isProcessing) return // Don't allow cancel during processing via Esc
      cancelSelection()
    }
  }, [cancelSelection, isProcessing])

  useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mousemove', updateSelection as any)
      document.addEventListener('mouseup', endSelection as any)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousemove', updateSelection as any)
      document.removeEventListener('mouseup', endSelection as any)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSelecting, updateSelection, endSelection, handleKeyDown])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('debug-log', { detail: 'ScreenshotTranslation component mounted, setting up event listener' }));
    
    // Listen for Tauri events
    const listeners: Promise<() => void>[] = [];

    console.log('Registering overlay event listeners');
    // Also dispatch to main window for visibility
    const logToMain = (msg: string) => {
        console.log(msg);
        // We can't easily dispatch to main window from here without backend help or broadcast
        // But we can try to use local storage or just rely on console
    };

    listeners.push(listen('trigger-screenshot-v2', () => {
       logToMain('Overlay received trigger-screenshot-v2');
       window.dispatchEvent(new CustomEvent('trigger-screenshot-ocr'));
    }));

    listeners.push(listen('trigger-silent-ocr-v2', () => {
       logToMain('Overlay received trigger-silent-ocr-v2');
       window.dispatchEvent(new CustomEvent('trigger-silent-ocr'));
    }));

    // Add a mount check
    invoke('ocr_ready_check').catch(() => {}); // Optional: tell backend we are ready

    const handleTrigger = async () => {
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Screenshot OCR event received' }));
      
      // Only proceed if we're not already active
      if (isActive) {
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Screenshot already active, ignoring duplicate trigger' }));
        return;
      }
      
      try {
        const appWindow = getCurrentWindow();

        window.dispatchEvent(new CustomEvent('ocr-capture-active', { detail: true }))
        
        // Activate the component
        setIsActive(true);
        
        // Get monitor info from cursor position
        const monitor = await invoke<MonitorInfo>('get_mouse_monitor');
        monitorRef.current = monitor;
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Monitor: ${monitor.x},${monitor.y} ${monitor.w}x${monitor.h} (${monitor.name})` }));
        
        // Setup window properties (fullscreen, etc)
        // For native overlay, we just need to ensure we cover the monitor
        await setupWindowForCapture(monitor.w, monitor.h);
        
        // Move window to the correct monitor
        await safeWindowCall('setPosition', () => appWindow.setPosition(new PhysicalPosition(monitor.x, monitor.y)));

        // Show window immediately for responsiveness (with transparent background)
        // This gives immediate feedback (cursor change) while we capture screen
        setIsSelecting(true);
        setHasStartedSelection(false);
        await safeWindowCall('show', () => appWindow.show());
        await safeWindowCall('setFocus', () => appWindow.setFocus());

        // Capture screen asynchronously
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Capturing screen...' }));
        
        // Add a small delay to ensure window is fully rendered/positioned before capturing?
        // Actually, we want to capture BEFORE the overlay obscures the screen if it wasn't transparent.
        // But our overlay is transparent initially (no image).
        // However, we need to be careful not to capture our own UI elements if they appear.
        // Since screenshotImage is empty, overlay is just transparent div.
        
        // Note: capture_screen might capture the overlay window itself if it's visible?
        // On Windows, GDI capture usually captures everything.
        // But our window is transparent (alpha), so it might not block the content behind it.
        // Let's try capturing after show. If it captures the crosshair cursor, that's fine.
        
        const base64 = await captureMonitorImage(monitor);
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Screen captured, updating background' }));
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Window setup complete, ready for selection' }));
      } catch (error) {
        console.error('Failed to setup window:', error)
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Setup failed: ${String(error)}` }));
        // Deactivate on error
        setIsActive(false);
        // Ensure window is shown if we failed
        await getCurrentWindow().show().catch(() => {});
        await restoreWindow().catch(() => {});
        window.dispatchEvent(new CustomEvent('ocr-capture-active', { detail: false }))
      }
    }

    window.addEventListener('trigger-screenshot-ocr', handleTrigger)
    window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Event listener for trigger-screenshot-ocr registered' }));
    
    return () => {
      listeners.forEach(p => p.then(f => f()));
      window.removeEventListener('trigger-screenshot-ocr', handleTrigger)
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Event listener for trigger-screenshot-ocr removed' }));
    }
  }, [])


  // Always render but hide when not active - event listener needs to be active
  if (!isActive) { // Changed from !isSelecting to keep component mounted but hidden
    return null; 
  }

  const selectionStyle = (isSelecting && hasStartedSelection && (Math.abs(currentPos.x - startPos.x) > 5 || Math.abs(currentPos.y - startPos.y) > 5)) ? {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y)
  } : null

  const getSelectionInfo = () => {
    if (!isSelecting || !hasStartedSelection) return null;
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    return { width: Math.round(width), height: Math.round(height) };
  }

  // Magnifier removed - not compatible with backend-only capture (no image data to magnify)

  const overlayStyle = {
    backgroundColor: 'transparent', // Make sure it's transparent
    // No background image anymore
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${isProcessing ? 'cursor-wait' : 'cursor-crosshair'}`}
      onMouseDown={!isProcessing ? startSelection : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!isProcessing) cancelSelection();
      }}
      style={{
        ...overlayStyle,
        // We still need a very slight background to capture mouse events?
        // Actually, transparent div captures events fine.
        // But maybe we want a slight dimming effect?
        // If we don't have the screenshot image, we can't do the "dim everything except selection" effect easily
        // without complex CSS masks or SVGs.
        // For now, let's use a very transparent background so user can see through.
        backgroundColor: 'rgba(0,0,0,0.01)', // Almost invisible but captures events
      }}
    >
      {/* Selection Box */}
      {selectionStyle && !isProcessing && (
        <div
          className="absolute border-2 border-[var(--ui-accent)] bg-[var(--ui-accent)]/10 shadow-lg pointer-events-none"
          style={{
            ...selectionStyle,
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.3), 0 0 20px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div className="absolute -top-8 left-0 bg-neutral-900/90 text-white px-2 py-1 rounded text-xs font-mono shadow-lg border border-white/10 backdrop-blur-sm">
            {getSelectionInfo()?.width} × {getSelectionInfo()?.height}
          </div>
          {/* Corner Handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full shadow-sm" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full shadow-sm" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none">
          <div className="bg-neutral-900/80 backdrop-blur-md text-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-white/10">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[var(--ui-accent)] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Processing Text...</p>
              <p className="text-sm text-white/60 mt-1">Analyzing image and translating</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar / Instructions */}
      {!isProcessing && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none select-none z-[60]">
          <div className="bg-neutral-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[var(--ui-accent)] rounded-full animate-pulse" />
              <span className="font-medium text-sm">Select Area</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-3 text-xs text-white/70">
              <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">LMB</kbd> Drag</span>
              <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">RMB</kbd> Cancel</span>
              <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">ESC</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



