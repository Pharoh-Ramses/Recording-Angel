"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic2,
  Users,
  Smartphone,
  Languages,
  Share2,
  Headphones,
  FileText,
  Globe,
} from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge
          variant="secondary"
          className="mb-4 bg-primary/20 text-primary hover:bg-primary/30"
        >
          How It Works
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Simple, Powerful, Accessible
        </h1>
        <p className="mt-6 max-w-3xl mx-auto text-lg text-light-100">
          Recording Angel Service makes it easy to provide real-time
          transcription and translation for your meetings. Here's how it works
          in just a few simple steps.
        </p>
      </div>

      {/* For Hosts Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          For Session Hosts
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Mic2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <span className="text-primary">1.</span> Start a Session
              </CardTitle>
              <CardDescription className="text-light-100">
                Click "Start Session" and allow microphone access. Your audio
                will be captured and processed in real-time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Share2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <span className="text-primary">2.</span> Share Session Code
              </CardTitle>
              <CardDescription className="text-light-100">
                Receive a unique session code. Share this code with your
                audience so they can join and follow along.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <span className="text-primary">3.</span> Speak Naturally
              </CardTitle>
              <CardDescription className="text-light-100">
                Just speak normally. Your words are automatically transcribed
                and streamed to all participants in real-time.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* For Participants Section */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          For Participants
        </h2>
        <div className="grid gap-8 md:grid-cols-4">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <span className="text-primary">1.</span> Join Session
              </CardTitle>
              <CardDescription className="text-light-100">
                Enter the session code provided by your host to join the live
                session.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Languages className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <span className="text-primary">2.</span> Choose Language
              </CardTitle>
              <CardDescription className="text-light-100">
                Select your preferred language from the dropdown menu for
                instant translation.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <span className="text-primary">3.</span> Read Captions
              </CardTitle>
              <CardDescription className="text-light-100">
                View live captions on your device as the speaker talks, in your
                chosen language.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Headphones className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <span className="text-primary">4.</span> Optional Audio
              </CardTitle>
              <CardDescription className="text-light-100">
                Enable audio if you want to listen along, or just read the
                captions silently.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Features Highlight */}
      <div className="mt-16 text-center">
        <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 max-w-3xl mx-auto">
          <CardContent className="p-8">
            <Globe className="size-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">
              Perfect for Any Setting
            </h3>
            <p className="text-light-100">
              Whether it's a church service, conference, lecture, or community
              meeting, Recording Angel Service ensures everyone can follow along
              in their preferred language. No special equipment needed – just a
              browser and an internet connection.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
