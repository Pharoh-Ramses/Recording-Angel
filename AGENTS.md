# AGENTS.md - Recording Angel

## Project Structure
- **marketing/**: Next.js marketing website
- **vite-app/**: Main React application (React Router 7)
- **python-api/**: Current working API (FastAPI + AssemblyAI)
- **go-api/**: Future API implementation (currently in development)

## Build/Lint/Test Commands

### Main App (React Router)
- `cd vite-app && npm run dev` - Start development server
- `cd vite-app && npm run build` - Build for production
- `cd vite-app && npm run typecheck` - Run TypeScript checks

### Current API (Python/FastAPI) 
- `cd python-api && uv run fastapi dev app/main.py` - Start dev server
- `cd python-api && uv run pytest` - Run all tests
- `cd python-api && uv run pytest tests/test_specific.py` - Run single test file
- `cd python-api && uv run ruff check` - Lint code
- `cd python-api && uv run black .` - Format code

### Marketing Site (Next.js)
- `cd marketing && npm run dev` - Start development server with Turbopack
- `cd marketing && npm run build` - Build for production  
- `cd marketing && npm run lint` - Run ESLint

### Future Go API (Development)
- `cd go-api && go run main.go` - Start Go API server
- `cd go-api && go test ./...` - Run all tests
- `cd go-api && go test -run TestSpecific` - Run single test

## Code Style Guidelines

### React/TypeScript (Main App)
- Use React Router 7, functional components with hooks
- Tailwind CSS for styling, strict TypeScript
- Component naming: PascalCase with default exports

### Python API (Current)
- Line length: 100 chars, use black/isort/ruff for formatting
- Type hints required, async/await for I/O operations
- Error handling: raise HTTPException with proper status codes

### Go (Future Migration)
- Standard Go formatting, explicit error handling
- Struct naming: PascalCase with JSON tags