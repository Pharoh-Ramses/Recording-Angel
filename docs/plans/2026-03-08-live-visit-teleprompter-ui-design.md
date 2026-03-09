# Live Visit UI Redesign: Teleprompter

**Date:** 2026-03-08
**Status:** Approved
**Reference mockups:** `mocks/chat-ui/1/listener.html`, `mocks/chat-ui/1/host.html`

## Problem

The current live visit UI (both listener and host views) is functionally correct but visually plain, has poor information hierarchy, lacks polish on mobile, and is missing features like audio visualization and better status indicators. The current listener view is simple scrolling paragraphs with a native `<select>` dropdown. The host view is a basic two-column grid with minimal controls.

## Design Direction

**Teleprompter** — a dark, cinema-subtitles aesthetic with large serif typography, smooth fade-in animations, and minimal chrome. Text emerges from the bottom like a teleprompter, creating a calm, focused reading experience.

## Listener View

### Visual Identity

- **Background:** Deep navy (`#1a1e2e`), not pure black
- **Typography:** Playfair Display (serif) for transcript text at 1.5rem / line-height 1.85. DM Sans for UI elements.
- **Color palette:** White text (`#f0f0f2`) for finalized segments, 45% opacity italic for interim text. Older segments (4+ back) dim to 55% opacity.

### Layout

- Full-screen transcript viewport with generous padding (5rem top, 8rem bottom)
- Max-width 620px centered container
- Segments flex-column with `justify-content: flex-end` so text anchors to the bottom

### Components

- **Top bar (fixed):** LIVE indicator (pulsing green dot + "LIVE" label) on the left, glass-effect language pill (flag emoji + "ES - Espanol") on the right. Background gradient fading to transparent so it doesn't block text.
- **Transcript area:** Each segment animates in with `translateY(28px)` + opacity fade over 0.7s using `cubic-bezier(0.16, 1, 0.3, 1)`. Interim segments have a blinking cursor via `::after` pseudo-element.
- **Bottom gradient:** 7rem gradient fade from `var(--bg-primary)` to transparent, creating the "text emerging from darkness" effect.
- **Session ended overlay:** Full-screen overlay with a thin 48px divider line and "SESSION ENDED" in small caps.

### Mobile Responsiveness

- 480px: font-size drops to 1.35rem, padding tightens
- 768px+: font-size increases to 1.65rem
- `user-scalable=no` for app-like feel
- `-webkit-overflow-scrolling: touch` for smooth momentum scrolling

### Language Picker

Replace the current full-screen language button list with the glassmorphism pill in the top-right corner. Tapping it opens a bottom sheet or dropdown with language options. The initial language selection screen (before joining) keeps the current centered button list but adopts the dark theme.

## Host Dashboard

### Visual Identity

Same dark palette as listener view. DM Sans for all UI text, Playfair Display for transcript text, JetBrains Mono for the timer and join code.

### Layout (3 fixed regions)

1. **Top bar** (56px fixed): Session controls and metadata
2. **Split columns** (fill remaining space): Source transcript left, translation preview right
3. **Bottom control bar** (72px fixed): Audio controls and session actions

### Top Bar

- **Left group:** LIVE badge (green pulsing dot + text), join code in a glass pill with monospace font (`K7M2XP`) and a copy-link button
- **Right group:** Listener count with person icon ("3 listeners"), translation language dropdown (styled custom `<select>` with glass background, not native)

### Split Columns

- CSS Grid `1fr 1fr` with 1px gap (border effect)
- Each column: header in small caps (e.g., "ENGLISH (SOURCE)"), scrollable content area
- Transcript segments use the same Playfair Display serif, slightly smaller (1.15rem) than listener view
- Same animation and dimming behavior as listener view
- Both columns auto-scroll in sync

### Bottom Control Bar

- **Left:** Circular mic toggle button (42px, green border/fill when active, red when muted) + 12-bar animated waveform visualization (CSS `scaleY` animation on 3px-wide bars)
- **Center:** Elapsed timer in JetBrains Mono with "ELAPSED" label below
- **Right:** "End Session" button (red text, subtle red background, no fill)

### Mobile Responsiveness (< 768px)

- Columns stack vertically (1fr rows)
- Waveform hidden
- Top bar wraps and adjusts padding
- Font sizes reduce

## Changes From Current Implementation

### Listener (`app/live/[sessionId]/page.tsx`)

1. Add dark theme (CSS variables for the color palette)
2. Replace plain `<p>` segments with animated `.segment` divs (translateY + opacity)
3. Add dimming of older segments (>4 back)
4. Replace native `<select>` with glassmorphism language pill
5. Add blinking cursor on interim segments
6. Add bottom gradient fade overlay
7. Add session ended overlay with divider animation
8. Add Google Fonts (Playfair Display, DM Sans)
9. Improve auto-scroll with `requestAnimationFrame`

### Host (`app/stake/.../live/page.tsx`)

1. Restructure to fixed top bar + split columns + fixed bottom bar
2. Add animated waveform visualization (12 CSS bars)
3. Add circular mic toggle button with color state
4. Add JetBrains Mono for timer and join code
5. Style join code as glass pill with copy button
6. Add listener count display
7. Style language dropdown with glass effect
8. Add column headers in small caps
9. Same segment animations and dimming as listener

### New Shared Assets

- CSS custom properties for the dark teleprompter palette (can coexist with the existing light theme)
- Segment animation keyframes (reusable across both views)
- Glass effect utility styles

## Non-Goals

- No changes to the WebSocket protocol or recording-angel API
- No changes to the language picker screen (pre-join) beyond adopting the dark theme
- No changes to the archive viewer
- No audio waveform from real audio data (CSS-only simulated visualization for now)
