import { useEffect, useState } from "react"

const phrases = [
  {
    english: "Welcome to our meeting",
    spanish: "Bienvenidos a nuestra reunión"
  },
  {
    english: "Today's speaker is",
    spanish: "El orador de hoy es"
  },
  {
    english: "Please open your scriptures",
    spanish: "Por favor abran sus escrituras"
  },
  {
    english: "Thank you for your testimony",
    spanish: "Gracias por tu testimonio"
  }
]

export function TranslationDemo() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTranslating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % phrases.length)
        setIsTranslating(false)
      }, 1000)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-dark-300/40 p-4 border border-primary/20">
      <div className="absolute -top-3 left-4 bg-dark-300 px-2 text-xs font-medium text-primary">
        Live Translation Demo
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-1000 ${
          isTranslating ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <p className="text-lg text-white">{phrases[currentIndex].english}</p>
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-1000 ${
          isTranslating ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <p className="text-lg italic text-primary">{phrases[currentIndex].spanish}</p>
      </div>
    </div>
  )
} 