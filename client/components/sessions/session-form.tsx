import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Define the session form data type
interface SessionFormData {
  title: string;
  wardId: string;
  date: string;
  time: string;
  languages: string[];
  hymns: string;
  notes: string;
}

export function SessionForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<SessionFormData>({
    title: "",
    wardId: "",
    date: "",
    time: "",
    languages: [],
    hymns: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here we would call an API to create the session
      // For now, we'll just simulate a successful creation
      console.log("Creating session with data:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to sessions page
      router.push("/sessions");
    } catch (error) {
      console.error("Error creating session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/sessions" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Session</CardTitle>
          <CardDescription>Set up a new recording session for your ward</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Session Title</Label>
              <Input 
                id="title" 
                name="title"
                placeholder="e.g., Sunday Sacrament Meeting" 
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wardId">Ward</Label>
              <Select 
                value={formData.wardId} 
                onValueChange={(value) => handleSelectChange("wardId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cedar-hills">Cedar Hills Ward</SelectItem>
                  <SelectItem value="mapleton">Mapleton 2nd Ward</SelectItem>
                  <SelectItem value="highland">Highland Ward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                name="date"
                type="date" 
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input 
                id="time" 
                name="time"
                type="time" 
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">Languages</Label>
              <Select 
                value={formData.languages[0] || ""} 
                onValueChange={(value) => handleSelectChange("languages", [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="asl">ASL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hymns">Hymns</Label>
              <Textarea 
                id="hymns" 
                name="hymns"
                placeholder="Enter hymn numbers and titles (e.g., #142 Sweet Hour of Prayer)"
                className="h-24"
                value={formData.hymns}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes" 
                name="notes"
                placeholder="Any additional information about the session"
                className="h-24"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" asChild>
                <Link href="/sessions">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Session"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 