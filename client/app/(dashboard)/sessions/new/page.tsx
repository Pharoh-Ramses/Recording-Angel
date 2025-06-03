import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSessionPage() {
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
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Session Title</Label>
              <Input id="title" placeholder="e.g., Sunday Sacrament Meeting" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Select>
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
              <Input id="date" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input id="time" type="time" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">Languages</Label>
              <Select>
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
                placeholder="Enter hymn numbers and titles (e.g., #142 Sweet Hour of Prayer)"
                className="h-24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Any additional information about the session"
                className="h-24"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" asChild>
                <Link href="/sessions">Cancel</Link>
              </Button>
              <Button type="submit">Create Session</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 