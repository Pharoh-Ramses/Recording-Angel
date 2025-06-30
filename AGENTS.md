# AGENTS.md - Recording Angel

## Build/Lint/Test Commands

### Client (Next.js)
- `cd client && npm run dev` - Start development server with Turbopack
- `cd client && npm run build` - Build for production
- `cd client && npm run lint` - Run ESLint
- `cd client && npm run db:migrate` - Run database migrations
- `cd client && npm run db:generate` - Generate database schema
- `cd client && npm run db:studio` - Open Drizzle Studio

### API (Go)
- `cd api && go run main.go` - Start Go API server
- `cd api && go test` - Run Go tests
- `cd api && go build` - Build Go binary

## Code Style Guidelines

### Client (TypeScript/React)
- Use `@/` path alias for imports, `import type { ... }` for types
- React components: PascalCase with default exports
- Use shadcn/ui components with Tailwind CSS and `cn()` utility
- Strict TypeScript with Zod schemas for validation
- Custom fonts: IBM Plex Sans, Palatino, Bebas Neue
- Toast notifications with Sonner, async ops return `{ success: boolean, error?: string }`

### API (Go)
- Package naming: lowercase, single words
- Struct naming: PascalCase with JSON tags
- Error handling: explicit error returns, log warnings/errors
- Database: PostgreSQL with prepared statements