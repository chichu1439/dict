import { useState, useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
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
  const [screenshotImage, setScreenshotImage] = useState('')
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const preCaptureStateRef = useRef<{ position: { x: number; y: number }; size: { width: number; height: number }; maximized: boolean } | null>(null)
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
        
        const data = canvas.toDataURL('image/png');
        resolve(data.split(',')[1]);
      };
      img.onerror = reject;
      img.src = `data:image/bmp;base64,${base64}`;
    });
  }

  const preprocessImage = async (base64Png: string, options: { enhance: boolean; mode: 'accuracy' | 'speed'; limitMaxSize: boolean; maxDimension: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = Math.max(img.width, img.height);
        let scaleFactor = 1;

        if (options.limitMaxSize && options.maxDimension > 0 && maxDim > options.maxDimension) {
          scaleFactor = options.maxDimension / maxDim;
        } else if (options.mode === 'accuracy' && maxDim < 900) {
          scaleFactor = Math.min(1.8, 900 / maxDim);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scaleFactor));
        canvas.height = Math.max(1, Math.round(img.height * scaleFactor));

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (options.enhance) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const w = canvas.width;
          const h = canvas.height;
          const gray = new Uint8ClampedArray(w * h);

          for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          }

          const boxBlur = (src: Uint8ClampedArray, width: number, height: number) => {
            const dst = new Uint8ClampedArray(src.length);
            for (let y = 0; y < height; y += 1) {
              for (let x = 0; x < width; x += 1) {
                let sum = 0;
                let count = 0;
                for (let dy = -1; dy <= 1; dy += 1) {
                  const ny = y + dy;
                  if (ny < 0 || ny >= height) continue;
                  for (let dx = -1; dx <= 1; dx += 1) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width) continue;
                    sum += src[ny * width + nx];
                    count += 1;
                  }
                }
                dst[y * width + x] = Math.round(sum / count);
              }
            }
            return dst;
          };

          const sharpen = (src: Uint8ClampedArray, width: number, height: number) => {
            const dst = new Uint8ClampedArray(src.length);
            for (let y = 0; y < height; y += 1) {
              for (let x = 0; x < width; x += 1) {
                const idx = y * width + x;
                const c = src[idx];
                const up = y > 0 ? src[(y - 1) * width + x] : c;
                const down = y < height - 1 ? src[(y + 1) * width + x] : c;
                const left = x > 0 ? src[y * width + (x - 1)] : c;
                const right = x < width - 1 ? src[y * width + (x + 1)] : c;
                const v = 5 * c - up - down - left - right;
                dst[idx] = Math.max(0, Math.min(255, v));
              }
            }
            return dst;
          };

          const otsuThreshold = (src: Uint8ClampedArray) => {
            const hist = new Array(256).fill(0);
            for (let i = 0; i < src.length; i += 1) hist[src[i]] += 1;
            const total = src.length;
            let sum = 0;
            for (let t = 0; t < 256; t += 1) sum += t * hist[t];

            let sumB = 0;
            let wB = 0;
            let wF = 0;
            let varMax = 0;
            let threshold = 128;

            for (let t = 0; t < 256; t += 1) {
              wB += hist[t];
              if (wB === 0) continue;
              wF = total - wB;
              if (wF === 0) break;
              sumB += t * hist[t];
              const mB = sumB / wB;
              const mF = (sum - sumB) / wF;
              const varBetween = wB * wF * (mB - mF) * (mB - mF);
              if (varBetween > varMax) {
                varMax = varBetween;
                threshold = t;
              }
            }
            return threshold;
          };

          let processed = gray;
          if (options.mode === 'accuracy') {
            processed = boxBlur(processed, w, h);
            processed = sharpen(processed, w, h);
            const threshold = otsuThreshold(processed);
            for (let i = 0; i < processed.length; i += 1) {
              processed[i] = processed[i] >= threshold ? 255 : 0;
            }
          } else {
            processed = sharpen(processed, w, h);
          }

          for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
            const v = processed[p];
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
    if (!isSelecting) return
    e.preventDefault()

    const width = Math.abs(e.clientX - startPos.x)
    const height = Math.abs(e.clientY - startPos.y)

    console.log('Selection ended:', width, height)
    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Selection ended: width=${width}, height=${height}, start=(${startPos.x}, ${startPos.y}), end=(${e.clientX}, ${e.clientY})` }));

    if (width < 10 || height < 10) {
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Selection too small, cancelling' }));
      
      // Show user-friendly notification
      const event = new CustomEvent('show-notification', {
        detail: {
          type: 'warning',
          title: 'Selection too small',
          message: 'Please select a larger area for accurate OCR.'
        }
      });
      window.dispatchEvent(event);
      
      setIsSelecting(false)
      setHasStartedSelection(false)
      restoreWindow()
      return
    }

    setIsSelecting(false)
    setHasStartedSelection(false)
    
    // Calculate selection coordinates (CSS pixels)
    const x = Math.min(startPos.x, e.clientX)
    const y = Math.min(startPos.y, e.clientY)

    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Processing capture at (${x}, ${y}) size ${width}x${height}` }));

    await processCapture(x, y, width, height)
    
    // Restore window only when closing results or if needed
    // For now keep it full screen to show results? 
    // Usually we want to restore so user can see other things.
    // But if we restore, the modal might look weird.
    // Let's restore for now.
    // await restoreWindow() 
  }, [isSelecting, startPos])

  const cancelSelection = useCallback(async () => {
    setIsSelecting(false)
    setHasStartedSelection(false)
    setScreenshotImage('')
    setIsActive(false) // Deactivate component
    await restoreWindow()
  }, [])

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
    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Processing capture: ${x},${y} ${w}x${h}` }));

    try {
      const appWindow = getCurrentWindow();
      const monitor = monitorRef.current;
      if (!monitor) {
        throw new Error('Monitor info not available');
      }

      await appWindow.hide();
      for (let i = 0; i < 8; i += 1) {
        const stillVisible = await appWindow.isVisible();
        if (!stillVisible) break;
        await new Promise(r => setTimeout(r, 40));
      }

      const source = screenshotImage || (await captureMonitorImage(monitor));
      if (!source) {
        throw new Error('Failed to capture screen for OCR');
      }

      await appWindow.show();
      await appWindow.setFocus();

      const croppedImage = await cropImage(source, x, y, w, h);
      const processedImage = await preprocessImage(croppedImage, {
        enhance: ocrEnhance,
        mode: ocrMode,
        limitMaxSize: ocrLimitMaxSize,
        maxDimension: ocrMaxDimension
      });
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Sending image to OCR...' }));

      const ocrResult = await invoke<{ text: string, confidence: number }>('ocr', {
        request: { 
          image_data: processedImage,
          language: ocrLanguage
        }
      });

      window.dispatchEvent(new CustomEvent('debug-log', { detail: `OCR Result: ${ocrResult.text.substring(0, 30)}...` }));

      if (ocrResult.text && ocrResult.text.trim()) {
        const info = { confidence: ocrResult.confidence, language: getOcrLanguageLabel(ocrLanguage) }
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `OCR Success: ${ocrResult.text.substring(0, 30)}...` }));
        if (ocrShowResult) {
          window.dispatchEvent(new CustomEvent('request-translation', { detail: { text: ocrResult.text, ocrInfo: info } }));
        } else {
          window.dispatchEvent(new CustomEvent('debug-log', { detail: 'OCR result suppressed (show result disabled).' }));
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
      await restoreWindow(ocrShowResult)
    }
  }

  const setupWindowForCapture = async (width: number, height: number) => {
    const appWindow = getCurrentWindow()
    await safeWindowCall('setAlwaysOnTop(true)', () => appWindow.setAlwaysOnTop(true))
    await safeWindowCall('setDecorations(false)', () => appWindow.setDecorations(false))
    await safeWindowCall('setResizable(true)', () => appWindow.setResizable(true))
    await safeWindowCall('setSize', () => appWindow.setSize(new PhysicalSize(width, height)))
    await safeWindowCall('setFocus', () => appWindow.setFocus())
  }

  const restoreWindow = useCallback(async (showWindow = true) => {
    const appWindow = getCurrentWindow()
    await safeWindowCall('setAlwaysOnTop(false)', () => appWindow.setAlwaysOnTop(false))
    await safeWindowCall('setResizable(true)', () => appWindow.setResizable(true))
    await safeWindowCall('setDecorations(true)', () => appWindow.setDecorations(true))
    if (showWindow) {
      await safeWindowCall('show', () => appWindow.show())
    }

    const pre = preCaptureStateRef.current
    try {
      if (pre?.maximized) {
        await safeWindowCall('maximize', () => appWindow.maximize())
      } else if (pre?.position && pre?.size) {
        await safeWindowCall('setPosition', () => appWindow.setPosition(new PhysicalPosition(pre.position.x, pre.position.y)))
        await safeWindowCall('setSize', () => appWindow.setSize(new PhysicalSize(pre.size.width, pre.size.height)))
      }
    } catch (error) {
      console.error('Failed to restore window position:', error)
    } finally {
      preCaptureStateRef.current = null
      window.dispatchEvent(new CustomEvent('ocr-capture-active', { detail: false }))
    }
    
    // Clear hotkey processing flag when done
    try {
      await invoke('clear_hotkey_processing');
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Cleared hotkey processing flag' }));
    } catch (error) {
      console.error('Failed to clear hotkey processing:', error);
    }
    
    // Deactivate component when restoring window
    setIsActive(false);
    setHasStartedSelection(false);
    setScreenshotImage('');
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isSelecting) {
      cancelSelection()
    }
  }, [cancelSelection, isSelecting])

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
        try {
          const pos = await appWindow.outerPosition();
          const size = await appWindow.innerSize();
          const maximized = await appWindow.isMaximized();
          preCaptureStateRef.current = { position: { x: pos.x, y: pos.y }, size: { width: size.width, height: size.height }, maximized };
        } catch (error) {
          console.error('Failed to capture pre-ocr window state:', error)
        }
        
        // Activate the component
        setIsActive(true);
        
        // Get monitor info from cursor position
        const monitor = await invoke<MonitorInfo>('get_mouse_monitor');
        monitorRef.current = monitor;
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Monitor: ${monitor.x},${monitor.y} ${monitor.w}x${monitor.h} (${monitor.name})` }));
        
        await safeWindowCall('hide', () => appWindow.hide())

        // Move window to the correct monitor
        await safeWindowCall('setPosition', () => appWindow.setPosition(new PhysicalPosition(monitor.x, monitor.y)));

        // Setup window properties (fullscreen, etc)
        await setupWindowForCapture(monitor.w, monitor.h);
        await captureMonitorImage(monitor);
        await new Promise(r => setTimeout(r, 30));
        
        // Activate overlay after window is in place
        setIsSelecting(true);
        setHasStartedSelection(false);
        
        // Finally show the window
        await safeWindowCall('show', () => appWindow.show());
        await safeWindowCall('setFocus', () => appWindow.setFocus());
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Window setup complete, ready for selection' }));
        // Don't set default positions - wait for user to click
        // setStartPos({ x: 0, y: 0 })
        // setCurrentPos({ x: 0, y: 0 })
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
      window.removeEventListener('trigger-screenshot-ocr', handleTrigger)
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Event listener for trigger-screenshot-ocr removed' }));
    }
  }, [])


  // Always render but hide when not active - event listener needs to be active
  if (!isSelecting) {
    return <div style={{ display: 'none' }} /> // Hidden but mounted, event listener active
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

  const overlayStyle = screenshotImage
    ? {
        backgroundImage: `url("data:image/png;base64,${screenshotImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.8) contrast(1.1)'
      }
    : undefined

  return (
    <div
      className="fixed inset-0 z-50 cursor-crosshair"
      onMouseDown={startSelection}
      style={{
        ...overlayStyle,
        backgroundColor: 'rgba(0,0,0,0.2)',
        backgroundBlendMode: 'overlay'
      }}
    >
      {selectionStyle && (
        <div
          className="absolute border-2 border-[var(--ui-accent)] bg-[var(--ui-accent)]/20 shadow-lg"
          style={{
            ...selectionStyle,
            boxShadow: '0 0 0 1px rgba(212, 175, 55, 0.3), 0 0 20px rgba(212, 175, 55, 0.45)'
          }}
        >
          <div className="absolute -top-8 left-0 bg-[var(--ui-text)] text-[var(--ui-accent)] px-2 py-1 rounded text-xs font-medium shadow-lg">
            {getSelectionInfo()?.width} x {getSelectionInfo()?.height}
          </div>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-[var(--ui-accent)] rounded-full border-2 border-white shadow-sm" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--ui-accent)] rounded-full border-2 border-white shadow-sm" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[var(--ui-accent)] rounded-full border-2 border-white shadow-sm" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--ui-accent)] rounded-full border-2 border-white shadow-sm" />
        </div>
      )}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white px-6 py-3 rounded-2xl shadow-2xl pointer-events-none select-none border border-neutral-700/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[var(--ui-accent)] rounded-full animate-pulse" />
          <div>
            <p className="text-sm font-medium tracking-wide">Drag to select the area to translate.</p>
            <p className="text-xs text-white/60 mt-1">Press ESC to cancel or release the mouse to finish.</p>
          </div>
        </div>
        {getSelectionInfo() && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-xs text-[var(--ui-accent)]">
              Selection: {getSelectionInfo()?.width} x {getSelectionInfo()?.height} px
            </p>
          </div>
        )}
      </div>
    </div>
  )
}



