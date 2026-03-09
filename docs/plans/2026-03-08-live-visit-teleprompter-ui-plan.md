# Live Visit Teleprompter UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the live visit listener and host views with a dark teleprompter aesthetic featuring animated text segments, glassmorphism elements, and an audio waveform visualization.

**Architecture:** Scoped dark theme via the live layout with CSS custom properties. Shared animated segment component used by both listener and host. Font loading via `next/font/google`. All changes scoped to `app/live/` and `app/stake/.../live/` routes — no impact on the rest of the app.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4.2, `next/font/google` for Playfair Display / DM Sans / JetBrains Mono

**Design reference:** `mocks/chat-ui/1/listener.html` and `mocks/chat-ui/1/host.html`

---

## Task 1: Add fonts and dark theme CSS variables

**Files:**

- Create: `apps/web/app/live/fonts.ts`
- Modify: `apps/web/app/live/layout.tsx`
- Modify: `apps/web/app/globals.css`

**Step 1: Create font configuration**

Create `apps/web/app/live/fonts.ts`:

```ts
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";

export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["500"],
});
```

**Step 2: Add teleprompter theme CSS variables**

Add to the end of `apps/web/app/globals.css` (before the `@layer base` block):

```css
/* Teleprompter dark theme — scoped to .theme-teleprompter */
.theme-teleprompter {
  --tp-bg-primary: #1a1e2e;
  --tp-bg-secondary: #151826;
  --tp-bg-panel: #1f2337;
  --tp-text-primary: #f0f0f2;
  --tp-text-secondary: rgba(240, 240, 242, 0.55);
  --tp-text-interim: rgba(240, 240, 242, 0.4);
  --tp-text-dimmed: rgba(240, 240, 242, 0.55);
  --tp-accent-green: #34d399;
  --tp-accent-green-glow: rgba(52, 211, 153, 0.25);
  --tp-accent-red: #f87171;
  --tp-accent-red-hover: #ef4444;
  --tp-glass-bg: rgba(255, 255, 255, 0.06);
  --tp-glass-bg-hover: rgba(255, 255, 255, 0.1);
  --tp-glass-border: rgba(255, 255, 255, 0.1);
  --tp-glass-border-hover: rgba(255, 255, 255, 0.18);
}

/* Teleprompter animations */
@keyframes tp-segment-in {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes tp-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}

@keyframes tp-blink {
  50% {
    opacity: 0;
  }
}

@keyframes tp-wave {
  0%,
  100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
}
```

**Step 3: Update the live layout**

Replace `apps/web/app/live/layout.tsx` with:

```tsx
import { playfairDisplay, dmSans, jetbrainsMono } from "./fonts";

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`theme-teleprompter min-h-dvh flex flex-col ${playfairDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      style={{
        backgroundColor: "var(--tp-bg-primary)",
        color: "var(--tp-text-primary)",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      {children}
    </div>
  );
}
```

Note: The old layout had a light header with "Our Stake / Live Visit". That header is removed — the listener view now has its own minimal top bar with LIVE indicator and language pill. The join page will need its own header (handled in Task 3).

**Step 4: Verify fonts load**

Run: `cd apps/web && npx next build`

Expected: Build succeeds, no font-related errors.

**Step 5: Commit**

```bash
git add apps/web/app/live/fonts.ts apps/web/app/live/layout.tsx apps/web/app/globals.css
git commit -m "feat(live): add teleprompter dark theme and font configuration"
```

---

## Task 2: Create shared teleprompter components

**Files:**

- Create: `apps/web/components/live/animated-segment.tsx`
- Create: `apps/web/components/live/live-indicator.tsx`
- Create: `apps/web/components/live/glass-language-pill.tsx`
- Create: `apps/web/components/live/waveform.tsx`

**Step 1: Create AnimatedSegment component**

Create `apps/web/components/live/animated-segment.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

interface AnimatedSegmentProps {
  text: string;
  isFinal: boolean;
  isDimmed?: boolean;
  className?: string;
}

export function AnimatedSegment({
  text,
  isFinal,
  isDimmed = false,
  className,
}: AnimatedSegmentProps) {
  return (
    <p
      className={cn(
        "leading-[1.85] animate-[tp-segment-in_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]",
        "opacity-0 translate-y-7",
        isFinal
          ? "text-[var(--tp-text-primary)]"
          : "text-[var(--tp-text-interim)] italic",
        isDimmed &&
          "!text-[var(--tp-text-dimmed)] transition-colors duration-1000",
        className,
      )}
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      {text}
      {!isFinal && (
        <span
          className="inline-block w-[2px] h-[1.1em] ml-[3px] align-text-bottom animate-[tp-blink_1s_step-end_infinite]"
          style={{ backgroundColor: "var(--tp-text-interim)" }}
        />
      )}
    </p>
  );
}
```

**Step 2: Create LiveIndicator component**

Create `apps/web/components/live/live-indicator.tsx`:

```tsx
interface LiveIndicatorProps {
  status: "live" | "connecting" | "ended";
}

export function LiveIndicator({ status }: LiveIndicatorProps) {
  if (status === "ended") {
    return (
      <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[var(--tp-text-secondary)]">
        <span className="h-[7px] w-[7px] rounded-full bg-[var(--tp-text-secondary)]" />
        Ended
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-yellow-400">
        <span className="h-[7px] w-[7px] rounded-full bg-yellow-400 animate-[tp-pulse_2s_ease-in-out_infinite]" />
        Connecting
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-[var(--tp-accent-green)]">
      <span
        className="h-[7px] w-[7px] rounded-full animate-[tp-pulse_2s_ease-in-out_infinite]"
        style={{
          backgroundColor: "var(--tp-accent-green)",
          boxShadow: "0 0 6px var(--tp-accent-green-glow)",
        }}
      />
      LIVE
    </div>
  );
}
```

**Step 3: Create GlassLanguagePill component**

Create `apps/web/components/live/glass-language-pill.tsx`:

```tsx
"use client";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Espanol",
  pt: "Portugues",
  fr: "Francais",
  de: "Deutsch",
  zh: "Chinese",
  ko: "Korean",
  ja: "Japanese",
  tl: "Tagalog",
  to: "Lea fakatonga",
  sm: "Gagana Samoa",
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "\u{1F1FA}\u{1F1F8}",
  es: "\u{1F1EA}\u{1F1F8}",
  pt: "\u{1F1E7}\u{1F1F7}",
  fr: "\u{1F1EB}\u{1F1F7}",
  de: "\u{1F1E9}\u{1F1EA}",
  zh: "\u{1F1E8}\u{1F1F3}",
  ko: "\u{1F1F0}\u{1F1F7}",
  ja: "\u{1F1EF}\u{1F1F5}",
  tl: "\u{1F1F5}\u{1F1ED}",
  to: "\u{1F1F9}\u{1F1F4}",
  sm: "\u{1F1FC}\u{1F1F8}",
};

interface GlassLanguagePillProps {
  language: string;
  languages: string[];
  onSwitch: (lang: string) => void;
}

export function GlassLanguagePill({
  language,
  languages,
  onSwitch,
}: GlassLanguagePillProps) {
  const flag = LANGUAGE_FLAGS[language] ?? "";
  const label = LANGUAGE_LABELS[language] ?? language.toUpperCase();

  if (languages.length <= 1) {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-medium"
        style={{
          backgroundColor: "var(--tp-glass-bg)",
          border: "1px solid var(--tp-glass-border)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          color: "rgba(240, 240, 242, 0.7)",
        }}
      >
        {flag && <span className="text-[0.85rem]">{flag}</span>}
        {language.toUpperCase()} &middot; {label}
      </div>
    );
  }

  return (
    <select
      value={language}
      onChange={(e) => onSwitch(e.target.value)}
      className="appearance-none px-3 py-1.5 rounded-full text-[0.7rem] font-medium outline-none cursor-pointer"
      style={{
        backgroundColor: "var(--tp-glass-bg)",
        border: "1px solid var(--tp-glass-border)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: "rgba(240, 240, 242, 0.7)",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      {languages.map((lang) => (
        <option key={lang} value={lang} style={{ background: "#1f2337" }}>
          {LANGUAGE_FLAGS[lang] ?? ""} {lang.toUpperCase()} &middot;{" "}
          {LANGUAGE_LABELS[lang] ?? lang}
        </option>
      ))}
    </select>
  );
}
```

**Step 4: Create Waveform component**

Create `apps/web/components/live/waveform.tsx`:

```tsx
interface WaveformProps {
  barCount?: number;
  active?: boolean;
}

const BAR_HEIGHTS = [8, 16, 24, 12, 20, 28, 14, 22, 10, 18, 26, 8];
const BAR_DELAYS = [
  0, 0.1, 0.15, 0.25, 0.05, 0.2, 0.3, 0.08, 0.22, 0.12, 0.18, 0.28,
];

export function Waveform({ barCount = 12, active = true }: WaveformProps) {
  return (
    <div
      className="flex items-center gap-[2.5px] h-8 px-1 transition-opacity duration-300"
      style={{ opacity: active ? 1 : 0.25 }}
    >
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-[3px] opacity-70"
          style={{
            height: `${BAR_HEIGHTS[i % BAR_HEIGHTS.length]}px`,
            backgroundColor: "var(--tp-accent-green)",
            animation: active
              ? `tp-wave 1.2s ease-in-out ${BAR_DELAYS[i % BAR_DELAYS.length]}s infinite`
              : "none",
          }}
        />
      ))}
    </div>
  );
}
```

**Step 5: Verify components compile**

Run: `cd apps/web && npx next build`

Expected: Build succeeds. Components are tree-shaken since nothing imports them yet — just verifying no syntax errors.

**Step 6: Commit**

```bash
git add apps/web/components/live/
git commit -m "feat(live): add shared teleprompter UI components"
```

---

## Task 3: Redesign the listener view

**Files:**

- Modify: `apps/web/app/live/[sessionId]/page.tsx`
- Modify: `apps/web/app/live/join/page.tsx` (adopt dark theme styling)

**Step 1: Rewrite the listener transcript view**

Replace `apps/web/app/live/[sessionId]/page.tsx`. The core logic (WebSocket connection, segment state management, handleTranscript, handleJoinWithLanguage, handleSwitchLanguage) stays the same. The JSX and styling changes completely.

Key changes from the current implementation:

- Remove the old status bar and plain paragraph layout
- Add: fixed top bar with `LiveIndicator` + `GlassLanguagePill`
- Add: transcript viewport with `AnimatedSegment` components and dimming logic
- Add: bottom gradient fade overlay
- Add: session ended overlay with divider
- Language picker screen: keep centered button list, adopt dark background and Playfair Display font
- Font sizes: 1.5rem base, 1.35rem at 480px, 1.65rem at 768px+

The component structure:

```
<div className="flex-1 flex flex-col relative overflow-hidden">
  {showLangPicker ? (
    <LanguagePickerScreen />       {/* Existing button list, dark-themed */}
  ) : (
    <>
      <TopBar />                   {/* Fixed: LiveIndicator + GlassLanguagePill */}
      <TranscriptViewport />       {/* Scrollable: AnimatedSegments */}
      <BottomGradient />           {/* Fixed: gradient fade overlay */}
      {sessionEnded && <EndedOverlay />}
    </>
  )}
</div>
```

Segment dimming: after each new segment, iterate all `.segment` elements. If index < (total - 4), add the dimmed style. Use a `useMemo` or inline logic in the map:

```tsx
{
  segments.map((seg, i) => (
    <AnimatedSegment
      key={seg.id}
      text={seg.text}
      isFinal={seg.isFinal}
      isDimmed={i < segments.length - 4}
      className="text-[1.5rem] max-[480px]:text-[1.35rem] min-[768px]:text-[1.65rem]"
    />
  ));
}
```

**Step 2: Update the join page styling**

Modify `apps/web/app/live/join/page.tsx` to adopt dark theme styling. The layout wraps in the `LiveLayout` which already sets the dark background, so the join page just needs to adjust text colors and button styles to work on dark backgrounds. Buttons should use `variant="outline"` with light borders.

Check what the current join page looks like, then adjust:

- Text headings: use `text-[var(--tp-text-primary)]`
- Muted text: use `text-[var(--tp-text-secondary)]`
- Input field: dark background with glass border
- Button: outline with glass styling
- Error messages: use `var(--tp-accent-red)`

**Step 3: Verify the listener view renders**

Run: `cd apps/web && npx next dev`

Open `http://localhost:3000/live/join` — verify dark theme, then join a session (or check the session page directly by crafting a URL with a `?code=` param). Verify:

- Dark background renders
- Playfair Display font loads for transcript text
- DM Sans loads for UI elements
- Language picker shows centered buttons on dark bg

**Step 4: Commit**

```bash
git add apps/web/app/live/
git commit -m "feat(live): redesign listener view with teleprompter aesthetic"
```

---

## Task 4: Redesign the host dashboard

**Files:**

- Modify: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/page.tsx`

**Step 1: Rewrite the host dashboard**

The host page at `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/page.tsx` needs the same dark teleprompter treatment. The page is NOT under the `/live` route (it's under `/stake/.../ward/.../live`), so it doesn't get `LiveLayout`. It needs to apply the theme itself.

Important: This page has 4 phases: idle, created, live, ended. The teleprompter theme applies primarily to the **live** phase. The idle and created phases should also adopt the dark look for consistency.

**All phases — wrap in teleprompter theme:**

The page component should import the fonts and wrap everything in the theme class:

```tsx
import { playfairDisplay, dmSans, jetbrainsMono } from "@/app/live/fonts";

// In the return:
<div
  className={`theme-teleprompter ${playfairDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
  style={{ fontFamily: "var(--font-dm-sans)" }}
>
  {/* existing phase-based rendering */}
</div>;
```

**Idle phase:** Dark background, Radio icon in muted color, "Live Visit" heading, "Start Session" button. Keep simple but on dark bg.

**Created phase:** Dark background, large monospace join code, copy link button with glass styling, "Go Live" button.

**Live phase — the main redesign:**

Layout structure (3 fixed regions):

```
<div className="flex flex-col h-dvh" style={{ backgroundColor: "var(--tp-bg-primary)" }}>
  {/* Top bar - fixed 56px */}
  <div className="shrink-0 h-14 flex items-center justify-between px-6 border-b"
       style={{ backgroundColor: "var(--tp-bg-secondary)", borderColor: "var(--tp-glass-border)" }}>
    <LeftGroup />    {/* LiveIndicator, JoinCode pill, CopyLink */}
    <RightGroup />   {/* Listener count, Language dropdown */}
  </div>

  {/* Split columns - fill remaining */}
  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0"
       style={{ gap: "1px", backgroundColor: "var(--tp-glass-border)" }}>
    <SourceColumn />
    <TranslationColumn />
  </div>

  {/* Bottom control bar - fixed 72px */}
  <div className="shrink-0 h-[72px] flex items-center justify-between px-6 border-t"
       style={{ backgroundColor: "var(--tp-bg-secondary)", borderColor: "var(--tp-glass-border)" }}>
    <MicButton + Waveform />
    <Timer />
    <EndButton />
  </div>
</div>
```

Key sub-components within the page (inline, not extracted):

- **Join code pill:** Monospace `K7M2XP` in glass-bg pill with copy button
- **Listener count:** Person SVG icon + "N listeners" text
- **Language dropdown:** Custom-styled `<select>` with glass background
- **Column headers:** Small-caps "ENGLISH (SOURCE)" / "ESPANOL (TRANSLATION)"
- **Mic button:** 42px circle with green border, toggles to red when muted
- **Timer:** JetBrains Mono, `formatTime(elapsed)`, "ELAPSED" label below
- **End button:** Red text + subtle red background, "End Session"

Both columns use `AnimatedSegment` with dimming. Each column scrolls independently, auto-scrolling on new segments.

**Ended phase:** Dark background, "Session Ended" message, "Start New Session" button.

**Step 2: Verify the host dashboard renders**

Run: `cd apps/web && npx next dev`

Navigate to a ward's live page. Verify all 4 phases render with dark theme. The live phase requires actually creating a session (or can be tested by temporarily hardcoding `sessionState` to `{ phase: "live", ... }`).

**Step 3: Commit**

```bash
git add apps/web/app/stake/
git commit -m "feat(live): redesign host dashboard with teleprompter aesthetic"
```

---

## Task 5: Polish and responsive fixes

**Files:**

- Modify: `apps/web/app/live/[sessionId]/page.tsx` (if needed)
- Modify: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/page.tsx` (if needed)
- Modify: `apps/web/components/live/animated-segment.tsx` (if needed)

**Step 1: Test mobile responsiveness**

Open the listener view in Chrome DevTools at 375px width (iPhone SE). Verify:

- Text is readable (1.35rem at this width)
- Language pill doesn't overlap LIVE indicator
- Segments scroll smoothly with momentum
- Bottom gradient doesn't obscure text
- No horizontal overflow

**Step 2: Test host dashboard at mobile widths**

Open host dashboard at 375px and 768px. Verify:

- Columns stack vertically below 768px
- Waveform is hidden on mobile (it's decorative, saves space)
- Top bar wraps gracefully
- Controls remain accessible with touch-friendly sizing

**Step 3: Test dark theme doesn't leak**

Navigate to non-live pages (ward feed, admin panel). Verify:

- No dark theme variables leak outside the live routes
- The `theme-teleprompter` class is scoped correctly

**Step 4: Fix any issues found, then commit**

```bash
git add -u
git commit -m "fix(live): responsive polish for teleprompter UI"
```

---

## Task 6: Update the archive viewer (optional consistency pass)

**Files:**

- Modify: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/archive/[sessionId]/page.tsx`

**Step 1: Adopt dark theme for archived transcript viewer**

The archive viewer at `apps/web/app/stake/.../live/archive/[sessionId]/page.tsx` shows saved transcripts. For visual consistency, apply the same teleprompter theme — dark background, Playfair Display text, same segment styling (without animations since these are static).

This is a lighter touch: wrap in theme class, use the serif font for transcript text, dark background. No animations needed since all segments are pre-loaded.

**Step 2: Commit**

```bash
git add apps/web/app/stake/
git commit -m "feat(live): apply teleprompter theme to archive transcript viewer"
```
