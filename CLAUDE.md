# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # Install dependencies, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack (http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Run vitest tests
npm run db:reset       # Reset database (npx prisma migrate reset --force)
```

Single test file: `npx vitest run src/components/chat/__tests__/MessageList.test.tsx`

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, and Claude generates/modifies files in a virtual filesystem that renders in real-time.

### Core Flow

1. **Chat API** (`src/app/api/chat/route.ts`): Handles streaming chat with Claude using Vercel AI SDK. The AI uses two tools to manipulate the virtual filesystem:
   - `str_replace_editor`: Create files, replace strings, insert lines, view files
   - `file_manager`: Rename and delete files

2. **Virtual File System** (`src/lib/file-system.ts`): In-memory filesystem class (`VirtualFileSystem`) that stores all generated code. No files are written to disk. Serializes to JSON for persistence.

3. **JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Transforms JSX/TSX using Babel standalone, creates blob URLs, and builds import maps for the preview iframe. Third-party packages are loaded from esm.sh.

4. **Preview Frame** (`src/components/preview/PreviewFrame.tsx`): Sandboxed iframe that renders the transformed code using import maps. Entry point defaults to `/App.jsx`.

### Context Providers

- `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`): Manages virtual filesystem state, handles tool calls from AI
- `ChatProvider` (`src/lib/contexts/chat-context.tsx`): Wraps Vercel AI SDK's `useChat`, syncs filesystem state with chat

### Key Conventions

- Generated components must have `/App.jsx` as the root entry point
- Local file imports use `@/` alias (e.g., `import Card from '@/components/Card'`)
- All styling uses Tailwind CSS (loaded via CDN in preview)
- The AI system prompt is in `src/lib/prompts/generation.tsx`

### Authentication

- JWT-based sessions (`src/lib/auth.ts`) with cookies
- Server actions for auth in `src/actions/index.ts`
- Middleware protects `/api/projects` and `/api/filesystem` routes
- Anonymous users can use the app but projects aren't persisted

### Database

- SQLite with Prisma
- Schema defined in `prisma/schema.prisma` - reference this file to understand data structure
- Models: User, Project
- Projects store messages and filesystem data as JSON strings

### Mock Provider

When `ANTHROPIC_API_KEY` is not set, `src/lib/provider.ts` uses a `MockLanguageModel` that returns static component examples (counter, form, card) for testing without API costs.
