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
  Archive,
  Brain,
  Edit3,
  Share2,
  Users,
  Languages,
  MessageSquare,
  BookOpen,
  Target,
  Globe,
} from "lucide-react";

export default function Features() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge
          variant="secondary"
          className="mb-4 bg-primary/20 text-primary hover:bg-primary/30"
        >
          Features
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Beyond Live Transcription
        </h1>
        <p className="mt-6 max-w-3xl mx-auto text-lg text-light-100">
          Recording Angel Service doesn't stop when your session ends. Discover
          powerful tools for speakers to improve and audiences to engage deeper
          with content.
        </p>
      </div>

      {/* For Speakers Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          For Speakers
        </h2>
        <p className="text-center text-light-100 mb-8 max-w-2xl mx-auto">
          Grow as a speaker with tools designed to help you reflect, improve,
          and share your message
        </p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Archive className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">Talk Archive</CardTitle>
              <CardDescription className="text-light-100">
                All your talks are automatically saved to your account. Access
                your complete speaking history anytime, anywhere.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Edit3 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Edit & Refine
              </CardTitle>
              <CardDescription className="text-light-100">
                Review and edit your transcribed talks. Perfect for creating
                written versions of your presentations or correcting any
                transcription errors.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                AI Speaking Coach
              </CardTitle>
              <CardDescription className="text-light-100">
                Enable AI critique to receive constructive feedback on your
                talks. Get insights on pacing, clarity, engagement, and
                personalized tips to improve.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Track Progress
              </CardTitle>
              <CardDescription className="text-light-100">
                Monitor your improvement over time with AI-generated metrics and
                see how your speaking skills develop with each talk.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Share2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Share Your Message
              </CardTitle>
              <CardDescription className="text-light-100">
                Share individual talks with specific users or groups. Perfect
                for reaching those who couldn't attend or want to revisit your
                message.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Speaking Tips
              </CardTitle>
              <CardDescription className="text-light-100">
                Receive AI-powered recommendations tailored to your speaking
                style, helping you connect better with your audience.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* For Listeners Section */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          For Listeners
        </h2>
        <p className="text-center text-light-100 mb-8 max-w-2xl mx-auto">
          Stay connected with content that matters to you and help improve
          translations for your community
        </p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Personal Library
              </CardTitle>
              <CardDescription className="text-light-100">
                Access all talks you've attended in your preferred language.
                Build your own library of meaningful content.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Shared Content
              </CardTitle>
              <CardDescription className="text-light-100">
                Receive talks shared by speakers, even if you weren't in the
                original session. Never miss important messages.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Languages className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Improve Translations
              </CardTitle>
              <CardDescription className="text-light-100">
                Help your language community by suggesting translation
                improvements. Your contributions help others understand better.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Community Contribution Section */}
      <div className="mt-16">
        <Card className="bg-dark-300/80 backdrop-blur-sm border-primary/30">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="size-10 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Community-Powered Translations
                </h3>
                <p className="text-light-100 mb-4">
                  When listeners suggest translation improvements, they're
                  reviewed by language admins who ensure accuracy and cultural
                  appropriateness. This collaborative approach means
                  translations get better over time, serving your multilingual
                  community more effectively.
                </p>
                <Badge
                  variant="secondary"
                  className="bg-primary/20 text-primary hover:bg-primary/30"
                >
                  Building Bridges Across Languages
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
