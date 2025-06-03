import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "next-auth/react";

import localFont from "next/font/local";
import { ReactNode } from "react";
import { auth } from "@/auth";

const palatinoSans = localFont({
  src: [
    { path: "/fonts/Palatino LT Light.ttf", weight: "300", style: "normal" },
    { path: "/fonts/Palatino LT Roman.ttf", weight: "400", style: "normal" },
    { path: "/fonts/Palatino LT Medium.ttf", weight: "500", style: "normal" },
    { path: "/fonts/Palatino LT Bold.ttf", weight: "600", style: "normal" },
    { path: "/fonts/Palatino LT Black.ttf", weight: "700", style: "normal" },
  ],
});

const bebasNeue = localFont({
  src: [
    { path: "/fonts/BebasNeue-Regular.ttf", weight: "400", style: "normal" },
  ],
  variable: "--bebas-neue",
});

export const metadata: Metadata = {
  title: "Recording Angel Service",
  description: "Streamline your church meetings with real-time transcription and speaker management.",
};

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  return (
    <html lang="en">
      <SessionProvider session={session}>
        <body
          className={`${palatinoSans.className} ${bebasNeue.variable} antialiased`}
        >
          {children}
          <Toaster />
        </body>
      </SessionProvider>
    </html>
  );
};

export default RootLayout;
