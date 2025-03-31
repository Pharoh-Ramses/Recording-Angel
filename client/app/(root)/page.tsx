'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic2, Globe2, Users, Shield, BarChart3, BookOpen, BookMarked } from "lucide-react"
import { TranslationDemo } from "@/components/TranslationDemo"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col root-container">
      {/* Hero Section */}
      <section className="container mx-auto flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="flex w-full flex-col items-center lg:flex-row lg:justify-between lg:gap-12">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:w-1/2">
            <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary hover:bg-primary/30">
              Recording Angel Service
            </Badge>
            <h1 className="font-bebas-neue text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Enhance Your <br />
              Church Meetings
            </h1>
            <p className="mt-6 max-w-xl text-lg text-light-100">
              Seamlessly manage speakers, transcribe talks in real-time, and provide instant translations for your congregation.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="bg-primary text-dark-100 hover:bg-primary/90">
                Start Session
              </Button>
              <Button size="lg" variant="outline" className="border-primary/30 text-dark-100 hover:bg-primary/10">
                Join Meeting
              </Button>
            </div>
          </div>

          <div className="mt-12 lg:mt-0 lg:w-1/2">
            <TranslationDemo />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Mic2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">Real-time Transcription</CardTitle>
              <CardDescription className="text-light-100">
                Instant transcription of speakers with high accuracy
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">Multi-language Support</CardTitle>
              <CardDescription className="text-light-100">
                Automatic translation to multiple languages
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">Speaker Management</CardTitle>
              <CardDescription className="text-light-100">
                Easy control of speakers and meeting flow
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20">
          <CardContent className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center lg:flex-row lg:text-left">
            <div className="flex-1">
              <h2 className="font-bebas-neue text-3xl font-bold text-white">
                Ready to Get Started?
              </h2>
              <p className="mt-2 text-lg text-light-100">
                Join thousands of congregations using Recording Angel Service
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/sign-in">
                <Button size="lg" className="bg-primary text-dark-100 hover:bg-primary/90">
                  Create Account
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="lg" variant="outline" className="border-primary/30 text-dark-100 hover:bg-primary/10">
                  Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
} 
