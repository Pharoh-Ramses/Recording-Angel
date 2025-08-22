# AGENTS.md - Recording Angel API

## Build/Lint/Test Commands

### API (Go)
- `go run main.go` - Start Go API server on port 8080
- `go test` - Run all tests
- `go test -run TestSpecificFunction` - Run single test
- `go build` - Build binary
- `go mod tidy` - Clean dependencies

### Marketing (Next.js)
- `cd ../marketing && npm run dev` - Start development server with Turbopack
- `cd ../marketing && npm run build` - Build for production  
- `cd ../marketing && npm run lint` - Run ESLint

## Code Style Guidelines

### API (Go)
- Package naming: lowercase, single words (main, models, handlers)
- Struct naming: PascalCase with JSON/DB tags (`json:"field_name" db:"field_name"`)
- Constants: PascalCase with type prefix (StatusPending, RoleMember)
- Error handling: explicit error returns, log.Println for warnings/errors
- Database: PostgreSQL with prepared statements, use sql.DB
- HTTP: gorilla/mux router, JSON responses, proper status codes
- WebSocket: gorilla/websocket for real-time transcription

### Marketing (TypeScript/React)
- Use `@/` path alias for imports, `import type { ... }` for types
- React components: PascalCase with default exports, "use client" for client components
- Use shadcn/ui components with `cn()` utility for conditional Tailwind classes
- Custom fonts: IBM Plex Sans (primary), Bebas Neue
- Colors: Primary #E7C9A5, use CSS variables for theming