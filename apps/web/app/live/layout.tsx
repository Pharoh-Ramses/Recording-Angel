import { playfairDisplay, dmSans, jetbrainsMono } from "./fonts";

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`theme-teleprompter min-h-dvh flex flex-col ${playfairDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      {children}
    </div>
  );
}
