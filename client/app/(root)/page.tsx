import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Mic2, Users, Globe, Shield, Clock } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Now Available for Church Meetings
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Recording Angel Service
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Streamline your church meetings with real-time transcription, multi-language support, and seamless speaker management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/login">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/demo">
                  Watch Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything you need for church meetings
            </h2>
            <p className="text-xl text-muted-foreground">
              Powerful features designed for church leaders and members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Mic2 className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Real-time Transcription</CardTitle>
                <CardDescription>
                  Accurate, instant transcription of all speakers and announcements
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Multi-language Support</CardTitle>
                <CardDescription>
                  Automatic translation into multiple languages for all participants
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Speaker Management</CardTitle>
                <CardDescription>
                  Easy speaker tracking and program management for leaders
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Enterprise-grade security with end-to-end encryption
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Meeting Analytics</CardTitle>
                <CardDescription>
                  Track attendance, participation, and meeting statistics
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to transform your church meetings?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of church leaders who trust Recording Angel Service
          </p>
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Start Free Trial
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
} 
