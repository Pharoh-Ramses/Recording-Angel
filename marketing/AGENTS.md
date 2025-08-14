# AGENTS.md - Recording Angel Marketing Site

## Build/Lint/Test Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Code Style Guidelines

### TypeScript/React

- Use `@/` path alias for imports, `import type { ... }` for types
- React components: PascalCase with default exports
- Use shadcn/ui components with Tailwind CSS and `cn()` utility
- Strict TypeScript enabled - proper typing required
- Custom fonts: IBM Plex Sans (primary), Palatino, Bebas Neue

### Styling & UI

- Tailwind CSS with custom color palette (primary: #E7C9A5, dark theme)
- Use `cn()` utility from @/lib/utils for conditional classes
- Components in components/ui/ follow shadcn/ui patterns
- Marketing pages: features/, how/, join/, missions/
