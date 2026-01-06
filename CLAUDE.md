# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MSI Propal Generator** (Hypothesis C) - Node.js commercial proposal generation system.

This is a POC-to-production architecture that generates commercial proposals using:
- Structured client brief input
- AI-powered content generation (DeepSeek)
- Template-based document generation (DOCX/PDF)

This is part of a 4-month industrial engineering project (MSI - Mission de Semestre Industriel) migrating from Google Apps Script to a clean, testable Node.js architecture.

## Development Commands

```bash
# Start development server
npm run dev

# Server runs on http://localhost:3000 (or PORT from .env)
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Required environment variables:
   - `SESSION_SECRET`: Session signing key (must be set, no default)
   - `DEEPSEEK_API_KEY`: DeepSeek AI API key
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`: Admin credentials (bcrypt hash)
   - `PORT`: Server port (default: 3000)
   - `FILE_BASE_URL`: Base URL for file access

To generate a password hash for ADMIN_PASSWORD_HASH:
```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('your-password', 12).then(console.log);
```

## Architecture

### Clean Architecture Layers (Strict Separation)

This codebase follows a **use case-driven architecture** with strict layer separation:

```
HTTP Request → Routes → Controllers → Use Cases → Adapters
                                          ↓
                                      Services
```

**Key principles:**
1. **Use Cases** (`usecases/`) contain ALL business logic
2. **Adapters** (`adapters/`) are pure technical connectors (NO business logic)
3. **Controllers** (`controllers/`) are thin HTTP adapters that delegate to use cases
4. **Routes** (`routes/`) define Express routing only

### Directory Structure

- `server.js` - Express app configuration, session setup, route mounting
- `routes/` - Express route definitions
  - `auth.routes.js` - `/auth` endpoints (login, logout, /me)
  - `proposal.routes.js` - `/api/proposal` endpoints (preview, generate)
- `controllers/` - HTTP request/response handlers that call use cases
- `usecases/` - Business logic orchestration
  - `previewProposal.usecase.js` - Transform draft → AI-generated sections
  - `generateProposal.usecase.js` - Generate final DOCX/PDF (currently stub)
- `adapters/` - External system connectors (NO business logic)
  - `ai/deepseek.adapter.js` - DeepSeek API client with JSON parsing
  - `document/pdf.adapter.js` - PDF generation adapter
  - `storage/docx.adapter.js` - DOCX template generation (docxtemplater)
  - `storage/file.adapter.js` - File storage operations
- `prompts/` - AI prompt templates
  - `icam.prompt.js` - System prompt + user message builder for Icam proposals
- `middleware/` - Express middleware
  - `requireAuth.js` - Session-based auth guard (redirects to /login)
  - `error.middleware.js` - Error handling
- `services/` - Reusable domain services (validation, cost calculation, etc.)
- `templates/` - DOCX templates for proposal generation
  - `contrat_rnd_icam.docx` - Main proposal template
- `storage/outputs/` - Generated files output directory
- `public/` - Frontend static files (HTML/CSS/JS)

### Authentication Flow

Session-based authentication with bcrypt password hashing:
- Public routes: `/login`, `/assets/*`, `/auth/*`
- Protected routes: `/` (index.html), `/api/proposal/*`
- Session cookie: `msi.sid` (httpOnly, sameSite: lax, 8h max age)
- Rate limiting: 5 login attempts per 10 minutes per IP
- Middleware: `requireAuth` redirects unauthenticated users to `/login`

### Proposal Generation Flow

1. **Preview** (`POST /api/proposal/preview`):
   - Input: `proposalDraft` JSON (client context + project brief)
   - Process: `previewProposal.usecase` → `deepseek.adapter` → `icam.prompt`
   - Output: AI-generated sections (titre, contexte, demarche, phases, phrase)

2. **Generate** (`POST /api/proposal/generate`):
   - Input: `proposalDraft` JSON with AI sections
   - Process: `generateProposal.usecase` → `docx.adapter` + `pdf.adapter`
   - Output: DOCX + PDF download URLs
   - **Status**: Currently stubbed, returns placeholder URLs

### AI Integration (DeepSeek)

- Adapter: `adapters/ai/deepseek.adapter.js`
- Model: `deepseek-chat` (configurable via `DEEPSEEK_MODEL`)
- Features:
  - Tolerant JSON parsing (extracts JSON from markdown fences)
  - Cost estimation (input: $0.28/1M tokens, output: $0.42/1M tokens)
  - Timeout: 120s default (configurable via `DEEPSEEK_TIMEOUT_MS`)
- Prompt system: Domain-specific prompts in `prompts/` (e.g., `icam.prompt.js`)

### Document Generation

- **DOCX**: `docxtemplater` with placeholder replacement (similar to Apps Script template engine)
  - Template: `templates/contrat_rnd_icam.docx`
  - Sanitization: Cleans markdown, normalizes line breaks for Word
  - Output: `storage/outputs/propale_<timestamp>.docx`
- **PDF**: Conversion adapter (implementation TBD)

## Important Implementation Notes

### When Adding Features

1. **Business logic belongs in use cases**, not in adapters or controllers
2. **Adapters must remain pure** - they only translate technical protocols (HTTP, AI API, file I/O)
3. **Prompts are domain artifacts** - store them in `prompts/`, not in adapters
4. **Controllers are thin** - they only handle HTTP concerns (req/res), then delegate to use cases

### Testing Strategy

When implementing tests:
- Test use cases with mocked adapters (business logic validation)
- Test adapters in isolation (technical integration validation)
- Controllers can be tested via supertest (HTTP contract validation)

### Session Management

- Sessions are stored in-memory (express-session default)
- For production: configure external session store (Redis, database)
- Session regeneration on login prevents session fixation attacks
- Cookie config adapts to NODE_ENV (secure flag for production)

## Migration Context (Hypothesis B → C)

This codebase maintains 100% functional parity with "Hypothesis B" (Google Apps Script version) while providing:
- Clean, testable architecture
- Portable deployment (no Google Workspace dependency)
- Production-ready patterns (session auth, rate limiting, error handling)

When comparing with previous implementations, focus on architectural improvements, not functional changes.
