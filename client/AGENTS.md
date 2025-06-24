# AGENTS.md - Recording Angel Client

## Build/Lint/Test Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate database schema
- `npm run db:studio` - Open Drizzle Studio

## Code Style Guidelines

### Imports & Structure
- Use `@/` path alias for imports (configured in tsconfig.json)
- Import types with `import type { ... }`
- Group imports: external packages, then internal modules

### TypeScript & Types
- Strict TypeScript enabled - use proper typing
- Use Zod schemas for validation (see lib/validations.ts)
- Interface naming: PascalCase, Props interfaces for components

### Components & Naming
- React components: PascalCase, default exports
- Use shadcn/ui components (configured with "new-york" style)
- Utility functions: camelCase
- File naming: kebab-case for components, camelCase for utilities

### Styling & UI
- Tailwind CSS with custom color palette and design tokens
- Use `cn()` utility from lib/utils.ts for conditional classes
- shadcn/ui components in components/ui/
- Custom fonts: IBM Plex Sans, Palatino, Bebas Neue

### Error Handling & Validation
- Use Zod schemas for form validation
- Toast notifications with Sonner
- Async operations should return `{ success: boolean, error?: string }`