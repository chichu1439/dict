import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'
import TranslationResult from './TranslationResult'
import { useSettingsStore } from '../stores/settingsStore'

interface TranslationService {
  name: string
  text: string
}

interface MonitorInfo {
    x: number;
    y: number;
    w: number;
    h: number;
    name: string;
}

interface TranslationResponse {
  results: TranslationService[]
}

export default function ScreenshotTranslation() {
  const [isActive, setIsActive] = useState(false) // Control whether component is active
  const [isSelecting, setIsSelecting] = useState(false)
  const [hasStartedSelection, setHasStartedSelection] = useState(false) // Track if user has actually started dragging
  const [ocrText, setOcrText] = useState('')
  const [screenshotImage, setScreenshotImage] = useState('')
  const [results, setResults] = useState<TranslationService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [translationError, setTranslationError] = useState<string | null>(null)

  const { services } = useSettingsStore()

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
          title: '选择区域过小',
          message: '请选择更大的区域以确保准确识别'
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
    setShowResults(true)
    setIsLoading(true)
    setErrorMsg(null)
    setTranslationError(null)
    setOcrText('')
    setResults([])
    
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
  }, [isSelecting, startPos, screenshotImage])

  const cancelSelection = useCallback(async () => {
    setIsSelecting(false)
    setHasStartedSelection(false)
    setScreenshotImage('')
    setIsActive(false) // Deactivate component
    await restoreWindow()
  }, [])

  const detectLanguage = (text: string): string => {
    const chineseRegex = /[\u4e00-\u9fa5]/
    if (chineseRegex.test(text)) {
      return 'zh'
    }
    return 'en'
  }

  const processCapture = async (x: number, y: number, w: number, h: number) => {
    setIsLoading(true)
    setErrorMsg(null)
    setTranslationError(null)
    window.dispatchEvent(new CustomEvent('debug-log', { detail: `Processing capture: ${x},${y} ${w}x${h}` }));

    try {
      let ocrResult;
      
      if (screenshotImage) {
        // Optimize: Use smaller image for faster processing if selection is small
        const MAX_SIZE = 1200; // Max dimension for processing
        let scaleFactor = 1;
        
        if (w > MAX_SIZE || h > MAX_SIZE) {
          scaleFactor = Math.min(MAX_SIZE / w, MAX_SIZE / h);
        }
        
        const scaledW = Math.round(w * scaleFactor);
        const scaledH = Math.round(h * scaleFactor);
        
        if (scaleFactor < 1) {
          window.dispatchEvent(new CustomEvent('debug-log', { detail: `Scaling image from ${w}x${h} to ${scaledW}x${scaledH} for faster processing` }));
        }
        
        // Crop from the screenshot
        const croppedImage = await cropImage(screenshotImage, x, y, w, h);
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Sending image to OCR...' }));
        
        // Use optimized processing
        ocrResult = await invoke<{ text: string, confidence: number }>('ocr', {
            request: { 
              image_data: croppedImage,
              optimize: true,
              max_dimension: MAX_SIZE
            }
        });
      } else {
        // Fallback to backend capture (if screenshotImage failed)
        // Adjust coordinates for DPR
        const dpr = window.devicePixelRatio || 1;
        ocrResult = await invoke<{ text: string, confidence: number }>('capture_and_ocr', {
            x: Math.round(x * dpr), 
            y: Math.round(y * dpr), 
            w: Math.round(w * dpr), 
            h: Math.round(h * dpr)
        })
      }

      setOcrText(ocrResult.text)
      window.dispatchEvent(new CustomEvent('debug-log', { detail: `OCR Result: ${ocrResult.text.substring(0, 30)}...` }));

      if (ocrResult.text && ocrResult.text.trim()) {
        const detected = detectLanguage(ocrResult.text)
        const target = detected === 'zh' ? 'en' : 'zh'

        const enabledServices = services.filter(s => s.enabled)
        const serviceNames = enabledServices.map(s => s.name)

        const config: Record<string, any> = {}
        for (const s of enabledServices) {
          config[s.name.toLowerCase()] = {
            apiKey: s.apiKey,
            accessKeyId: s.accessKeyId,
            accessKeySecret: s.accessKeySecret
          }
        }

        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Translating to ${target}...` }));
        
        try {
          const response = await invoke<TranslationResponse>('translate', {
            request: {
              text: ocrResult.text,
              source_lang: detected,
              target_lang: target,
              services: serviceNames,
              config: config
            }
          })

          setResults(response.results)
          window.dispatchEvent(new CustomEvent('debug-log', { detail: `Translation done (${response.results.length} results)` }));
        } catch (transError) {
          console.error('Translation error:', transError);
          setTranslationError('翻译服务暂时不可用，请检查网络或配置');
          window.dispatchEvent(new CustomEvent('debug-log', { detail: `Translation error: ${String(transError)}` }));
        }
      } else {
          setErrorMsg("No text detected in the selected area.");
          window.dispatchEvent(new CustomEvent('debug-log', { detail: 'No text detected' }));
      }
    } catch (error) {
      console.error('Screenshot translation error:', error)
      
      // Enhanced error messages for better UX
      let userFriendlyMsg = '处理过程中出现错误';
      const errorStr = String(error);
      
      if (errorStr.includes('OCR') && errorStr.includes('No text')) {
        userFriendlyMsg = '未在所选区域检测到文本，请确保选择包含清晰文字的区域';
      } else if (errorStr.includes('network') || errorStr.includes('Network')) {
        userFriendlyMsg = '网络连接错误，请检查网络连接后重试';
      } else if (errorStr.includes('API') || errorStr.includes('api')) {
        userFriendlyMsg = '翻译服务暂时不可用，请稍后重试';
      } else if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
        userFriendlyMsg = '处理超时，请尝试选择更小的区域';
      } else if (errorStr.includes('empty') || errorStr.includes('Empty')) {
        userFriendlyMsg = '未检测到有效文本，请重新选择区域';
      }
      
      window.dispatchEvent(new CustomEvent('debug-log', { detail: `Error: ${errorStr} -> User message: ${userFriendlyMsg}` }));
      setErrorMsg(userFriendlyMsg);
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isSelecting) {
        cancelSelection()
      } else if (showResults) {
        setShowResults(false)
        setOcrText('')
        setResults([])
        setScreenshotImage('')
        restoreWindow()
      }
    }
  }, [cancelSelection, isSelecting, showResults, isActive, hasStartedSelection])

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

  const setupWindowForCapture = async () => {
    const appWindow = getCurrentWindow()
    await appWindow.setFullscreen(true)
    await appWindow.setDecorations(false)
    await appWindow.setAlwaysOnTop(true)
    await appWindow.setFocus()
  }

  const restoreWindow = useCallback(async () => {
    const appWindow = getCurrentWindow()
    await appWindow.setFullscreen(false)
    await appWindow.setDecorations(true)
    await appWindow.setAlwaysOnTop(false)
    
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
  }, [])

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
        
        // Activate the component
        setIsActive(true);
        
        // Get monitor info from cursor position
        const monitor = await invoke<MonitorInfo>('get_mouse_monitor');
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Monitor: ${monitor.x},${monitor.y} ${monitor.w}x${monitor.h} (${monitor.name})` }));
        
        // Quick fade out effect before hiding - but only if window is visible
        const isVisible = await appWindow.isVisible();
        if (isVisible) {
          document.body.style.transition = 'opacity 0.1s ease-out';
          document.body.style.opacity = '0';
        }
        
        // Hide window to capture background (only if visible)
        if (isVisible) {
          await appWindow.hide();
        }
        await new Promise(r => setTimeout(r, 100)); // Reduced wait time
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Window hidden, capturing screen...' }));
        
        // Capture specific monitor
        const image = await invoke<string>('capture_screen', {
            x: Math.round(monitor.x),
            y: Math.round(monitor.y),
            w: Math.round(monitor.w),
            h: Math.round(monitor.h)
        });
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Screen captured, image size: ${image.length} bytes` }));
        
        setScreenshotImage(image);
        
        // Activate overlay immediately to prevent main window flash
        setIsSelecting(true);
        
        // Move window to the correct monitor
        await appWindow.setPosition(new PhysicalPosition(monitor.x, monitor.y));

        // Restore opacity
        document.body.style.opacity = '1';
        
        // Setup window properties (fullscreen, etc)
        await setupWindowForCapture();
        
        // Finally show the window
        await appWindow.show();
        await appWindow.setFocus();
        
        window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Window setup complete, ready for selection' }));
        // Don't set default positions - wait for user to click
        // setStartPos({ x: 0, y: 0 })
        // setCurrentPos({ x: 0, y: 0 })
      } catch (error) {
        console.error('Failed to setup window:', error)
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Setup failed: ${String(error)}` }));
        // Restore opacity on error
        document.body.style.opacity = '1';
        // Deactivate on error
        setIsActive(false);
        // Ensure window is shown if we failed
        await getCurrentWindow().show().catch(() => {});
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
  if (!isSelecting && !showResults) {
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

  return (
    <>
      {isSelecting && (
        <div className="fixed inset-0 bg-black/20 z-50 cursor-crosshair" onMouseDown={startSelection}>
          {screenshotImage && (
             <img src={`data:image/bmp;base64,${screenshotImage}`} className="absolute inset-0 w-full h-full object-cover z-[-1] pointer-events-none" />
          )}
          
          {/* Selection rectangle with enhanced styling */}
          {selectionStyle && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-400/20 shadow-lg"
              style={{
                ...selectionStyle,
                boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.5)'
              }}
            >
              {/* Selection size indicator */}
              <div className="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                {getSelectionInfo()?.width} × {getSelectionInfo()?.height}
              </div>
              
              {/* Selection handles for better UX */}
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
            </div>
          )}
          
          {/* Enhanced instruction panel */}
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-3 rounded-xl shadow-2xl pointer-events-none select-none border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium">拖动选择要翻译的区域</p>
                <p className="text-xs text-gray-400 mt-1">按 ESC 键取消 • 松开鼠标完成选择</p>
              </div>
            </div>
            
            {/* Real-time selection info */}
            {getSelectionInfo() && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-blue-300">
                  选择区域: {getSelectionInfo()?.width} × {getSelectionInfo()?.height} 像素
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showResults && !isSelecting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
            setShowResults(false)
            restoreWindow()
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Screenshot Translation</h2>
              <button
                onClick={() => {
                    setShowResults(false)
                    restoreWindow()
                }}
                className="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-10 h-10 border-3 border-blue-300 border-t-transparent rounded-full animate-spin animation-delay-150"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">正在识别和翻译文本...</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">请稍候，这可能需要几秒钟</p>
                  </div>
                </div>
              </div>
            ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">处理失败</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md">{errorMsg}</p>
                </div>
            ) : (
              <div className="p-6 space-y-6">
                {ocrText && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800/30 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">识别的原文</h3>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed bg-white/50 dark:bg-black/20 rounded-lg p-3 border-l-4 border-blue-400">
                      {ocrText}
                    </p>
                  </div>
                )}
                
                {translationError && (
                   <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800/30 flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">翻译失败</h3>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{translationError}</p>
                      </div>
                   </div>
                )}

                {results.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800/30 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">翻译结果</h3>
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded-full">
                        {results.length} 个服务
                      </span>
                    </div>
                    <TranslationResult sourceText={ocrText} results={results} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
