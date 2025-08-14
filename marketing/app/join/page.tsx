import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function JoinPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Join the Community
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-6">
            Connect with Recording Angel
          </h1>
          <p className="text-xl text-light-100 max-w-2xl mx-auto">
            Join thousands of communities already using Recording Angel for seamless real-time translation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="text-white">For Organizations</CardTitle>
              <CardDescription className="text-light-100">
                Perfect for churches, schools, and community groups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-light-100">
                <li>• Multi-language support</li>
                <li>• Real-time transcription</li>
                <li>• Easy session management</li>
                <li>• No technical expertise required</li>
              </ul>
              <Button className="w-full bg-primary text-dark-100 hover:bg-primary/90">
                Request Demo
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-dark-300/60 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="text-white">For Individuals</CardTitle>
              <CardDescription className="text-light-100">
                Join sessions and access translations instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-light-100">
                <li>• Simple session codes</li>
                <li>• Mobile-friendly interface</li>
                <li>• No downloads required</li>
                <li>• Works on any device</li>
              </ul>
              <Button className="w-full bg-primary text-dark-100 hover:bg-primary/90">
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-light-100 mb-6">
            Ready to break down language barriers in your community?
          </p>
          <Button size="lg" className="bg-primary text-dark-100 hover:bg-primary/90">
            Contact Us Today
          </Button>
        </div>
      </div>
    </div>
  );
}
