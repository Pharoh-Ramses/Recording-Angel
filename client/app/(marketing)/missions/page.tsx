"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Brain,
  Archive,
  BarChart3,
  Headphones,
  MessageSquare,
  Target,
  Shield,
  BookOpen,
  TrendingUp,
  Eye,
  Share2,
} from "lucide-react";

export default function ForMissions() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge
          variant="secondary"
          className="mb-4 bg-primary/20 text-primary hover:bg-primary/30"
        >
          Mission Training Platform
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Elevate Missionary Teaching
        </h1>
        <p className="mt-6 max-w-3xl mx-auto text-lg text-light-100">
          Transform how missionaries prepare and improve their teaching skills
          with AI-powered practice sessions, real-time feedback, and
          mission-wide learning.
        </p>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          How Mission Training Works
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20">
            <CardHeader className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto">
                <Users className="size-6 text-primary" />
              </div>
              <CardTitle className="text-lg text-white">
                1. Practice Together
              </CardTitle>
              <CardDescription className="text-light-100 text-sm">
                Missionaries role-play teaching scenarios with companions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20">
            <CardHeader className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto">
                <Brain className="size-6 text-primary" />
              </div>
              <CardTitle className="text-lg text-white">
                2. Get AI Feedback
              </CardTitle>
              <CardDescription className="text-light-100 text-sm">
                Receive instant, customized feedback on teaching effectiveness
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20">
            <CardHeader className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto">
                <Eye className="size-6 text-primary" />
              </div>
              <CardTitle className="text-lg text-white">
                3. Leadership Support
              </CardTitle>
              <CardDescription className="text-light-100 text-sm">
                Mission presidents can observe and provide targeted guidance
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20">
            <CardHeader className="text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto">
                <Share2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-lg text-white">
                4. Share Excellence
              </CardTitle>
              <CardDescription className="text-light-100 text-sm">
                Best sessions become teaching examples for the entire mission
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* For Missionaries */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-2">For Missionaries</h2>
        <p className="text-light-100 mb-8">
          Practice with purpose and improve with every session
        </p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Realistic Practice
              </CardTitle>
              <CardDescription className="text-light-100">
                Role-play common teaching scenarios with your companion. Every
                session is automatically recorded and transcribed for review.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Smart AI Coaching
              </CardTitle>
              <CardDescription className="text-light-100">
                Get immediate feedback on your teaching approach, scripture use,
                and testimony bearing - all customized to your mission's
                standards.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Track Progress
              </CardTitle>
              <CardDescription className="text-light-100">
                See your improvement over time. Review past sessions to remember
                successful approaches and learn from challenges.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        {/* Leadership Support Block */}
        <Card className="mt-8 bg-dark-300/60 backdrop-blur-sm border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="size-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">
                  Real-Time Leadership Support
                </h3>
                <p className="text-light-100 mb-4">
                  During your practice sessions, mission leadership can join to
                  provide immediate guidance and support. Your mission
                  president, district leaders, zone leaders, and assistants to
                  the president (APs) can observe and offer real-time feedback
                  to help you improve.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="size-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Live Feedback
                      </p>
                      <p className="text-light-100 text-sm">
                        Get coaching in the moment from experienced leaders
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Eye className="size-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Always Notified
                      </p>
                      <p className="text-light-100 text-sm">
                        You'll see when leadership joins your session
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="size-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Peer Mentoring
                      </p>
                      <p className="text-light-100 text-sm">
                        Learn from district and zone leaders' experience
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="size-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Safe Environment
                      </p>
                      <p className="text-light-100 text-sm">
                        Practice knowing leadership is there to help, not judge
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transparency Notice */}
        <Card className="mt-8 bg-primary/10 border-primary/30">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Shield className="size-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <CardTitle className="text-lg text-white">
                  Full Transparency
                </CardTitle>
                <CardDescription className="text-light-100">
                  You'll always know when mission leadership joins your practice
                  session. A notification appears immediately, ensuring open and
                  honest training environment.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* For Mission Presidents */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-2">
          For Mission Presidents
        </h2>
        <p className="text-light-100 mb-8">
          Lead with insight and elevate your mission's teaching standard
        </p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Mission Dashboard
              </CardTitle>
              <CardDescription className="text-light-100">
                See real-time practice activity across your mission. Know who's
                preparing and when they need support.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Customize AI Feedback
              </CardTitle>
              <CardDescription className="text-light-100">
                Tailor the AI coaching to emphasize your mission's specific
                teaching priorities and doctrinal focuses.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Headphones className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Live Observation
              </CardTitle>
              <CardDescription className="text-light-100">
                Join practice sessions to provide real-time support.
                Missionaries are notified of your presence immediately.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Personalized Critiques
              </CardTitle>
              <CardDescription className="text-light-100">
                Send detailed feedback on specific sessions. Help missionaries
                understand their strengths and growth areas.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Archive className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Complete Archive
              </CardTitle>
              <CardDescription className="text-light-100">
                Access all practice sessions from your mission. Identify
                patterns and share best practices mission-wide.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-white">
                Highlight Excellence
              </CardTitle>
              <CardDescription className="text-light-100">
                Share exemplary sessions with your entire mission, showing what
                great teaching looks like in practice.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Mission-Wide Learning */}
      <Card className="bg-dark-300/80 backdrop-blur-sm border-primary/30 mb-16">
        <CardContent className="p-8">
          <div className="text-center">
            <Share2 className="size-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">
              Create a Culture of Excellence
            </h3>
            <p className="text-light-100 mb-6 max-w-2xl mx-auto">
              When mission presidents share outstanding teaching examples, every
              missionary benefits. They see real examples from their peers,
              understand what made it effective, and can apply those principles
              in their own teaching. This creates a mission-wide culture of
              continuous improvement and shared learning.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Badge
                variant="secondary"
                className="bg-primary/20 text-primary hover:bg-primary/30"
              >
                Peer Learning
              </Badge>
              <Badge
                variant="secondary"
                className="bg-primary/20 text-primary hover:bg-primary/30"
              >
                Best Practice Sharing
              </Badge>
              <Badge
                variant="secondary"
                className="bg-primary/20 text-primary hover:bg-primary/30"
              >
                Unified Standards
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-4">
          Ready to Transform Your Mission's Training?
        </h3>
        <p className="text-light-100 mb-8 max-w-2xl mx-auto">
          Join missions worldwide using Recording Angel Service to prepare more
          effective teachers and strengthen testimonies through practice.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            className="bg-primary text-dark-100 hover:bg-primary/90"
          >
            Schedule Mission Demo
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary/30 text-dark-100 hover:bg-primary/10"
          >
            Contact Us
          </Button>
        </div>
      </div>
    </div>
  );
}
