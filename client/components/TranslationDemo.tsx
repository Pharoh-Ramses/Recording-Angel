import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic2 } from "lucide-react"

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
  const [translationHistory, setTranslationHistory] = useState<Array<{ english: string; spanish: string; id: number }>>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % phrases.length)
      setTranslationHistory((prev) => [...prev, { ...phrases[currentIndex], id: nextId.current++ }])
    }, 1500)

    return () => clearInterval(interval)
  }, [currentIndex])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [translationHistory])

  return (
    <Card className="w-full bg-dark-300/60 backdrop-blur-sm border-primary/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-primary/10">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Mic2 className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl text-white font-bold">Live Translation</CardTitle>
            <Badge variant="secondary" className="mt-1 bg-primary/20 text-primary hover:bg-primary/30 ring-1 ring-primary/20">
              Active Speaker
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-light-100 font-medium">
          <span>English</span>
          <span className="text-primary">→</span>
          <span>Spanish</span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-dark-300/40 p-6 ring-1 ring-primary/10">
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 flex flex-col overflow-y-auto hide-scrollbar px-2"
          >
            {translationHistory.map((phrase) => (
              <div 
                key={phrase.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex gap-4">
                  <div className="flex-1 text-white font-medium">{phrase.english}</div>
                  <div className="w-px bg-primary/20"></div>
                  <div className="flex-1 text-right italic text-primary font-medium">{phrase.spanish}</div>
                </div>
                <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-primary/10 to-transparent"></div>
              </div>
            ))}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-4 bg-primary/5 rounded-lg p-4 -mx-4">
                <div className="flex-1 text-white font-medium">{phrases[currentIndex].english}</div>
                <div className="w-px bg-primary/20"></div>
                <div className="flex-1 text-right italic text-primary font-medium">{phrases[currentIndex].spanish}</div>
              </div>
              <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-primary/10 to-transparent"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 