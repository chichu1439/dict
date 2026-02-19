import { useState, useEffect, useRef } from 'react'

export default function SelectTranslation() {
  const [showTranslateButton, setShowTranslateButton] = useState(false)
  const buttonPosition = useRef({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')

  useEffect(() => {
    // Handle text selection within the app
    const handleTextSelection = (e: MouseEvent) => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      if (text && text.length > 0) {
        buttonPosition.current = { x: e.clientX + 10, y: e.clientY + 10 }
        setSelectedText(text)
        setShowTranslateButton(true)
      } else {
        setShowTranslateButton(false)
      }
    }

    document.addEventListener('mouseup', handleTextSelection)
    
    // Also listen for a request to handle clipboard content if needed, 
    // but primarily we just want to be the in-app selection tool now.

    return () => {
      document.removeEventListener('mouseup', handleTextSelection)
    }
  }, [])

  const handleTranslate = () => {
    setShowTranslateButton(false)
    // Dispatch event to App.tsx to switch tab and translate
    window.dispatchEvent(new CustomEvent('request-translation', { detail: selectedText }));
  }

  if (!showTranslateButton) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: buttonPosition.current.x,
        top: buttonPosition.current.y,
        zIndex: 10000,
      }}
      className="bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-strong)] text-[#171717] px-3 py-2 rounded-lg shadow-lg text-sm cursor-pointer transition-colors flex items-center gap-2"
      onClick={handleTranslate}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      Translate
    </div>
  )
}
