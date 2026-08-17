# Pilgrixaistudio

An AI-powered media editor and studio application built with React, TypeScript, and Vite.

## Project Overview

Pilgrixaistudio is a modern web-based media editing application that allows users to:

- Upload and manage media projects (images, videos, audio, documents)
- Edit and process media with AI assistance
- Organize media into projects
- Preview and export finished work
- Communicate with an integrated AI editing assistant

## Architecture

The application is built with modern web technologies and follows a modular component architecture:

```
src/
├── components/      # Reusable UI components
├── pages/          # Page-level components
├── layouts/        # Layout components
├── hooks/          # Custom React hooks
├── services/       # Business logic and API services
├── types/          # TypeScript interfaces and types
├── utils/          # Utility functions
├── lib/            # Library functions and configuration
└── styles/         # Global styles and Tailwind CSS
```

## Technology Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Code Quality**: ESLint + TypeScript strict mode
- **Package Manager**: npm
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pilgrix-ux/Pilgrixaistudio.git
cd Pilgrixaistudio
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

### Type Checking

This project uses strict TypeScript configuration. All files must pass type checking:

```bash
npm run type-check
```

### Code Quality

Linting is enforced via ESLint:

```bash
npm run lint
```

## Project Structure

### Components

Reusable UI components with TypeScript props:

- `Header` - Application header with navigation
- `Sidebar` - Navigation sidebar
- `ProjectCard` - Project display card
- `NewProjectModal` - Create project dialog
- `MediaUpload` - Media file upload area
- `AIAssistantPanel` - AI assistant interface
- `EmptyState` - Empty state placeholder

### Services

Business logic and data management:

- `projectService` - Project CRUD operations
- `mediaService` - Media asset management
- `aiService` - AI integration (stub for future implementation)

### Types

TypeScript interfaces for type safety:

- `Project` - Project data structure
- `MediaAsset` - Media file representation
- `EditorState` - Editor application state
- `AIAction` - AI operation tracking
- `User` - User profile

### Hooks

Custom React hooks for state management:

- `useEditorState` - Editor state management
- `useAsync` - Async operation handling

## Configuration

### Environment Variables

Configure the application via `.env.local`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AI_PROVIDER=none
VITE_AI_API_URL=
VITE_AI_MODEL=not-configured
VITE_STORAGE_BUCKET=
VITE_MAX_FILE_SIZE=104857600
VITE_API_BASE_URL=http://localhost:3000
```

Keep provider secrets out of browser-facing `VITE_` variables. The AI provider key, model secret, and private credentials must be configured on the server-side API boundary instead.

See `.env.example` for all available variables.

### Build Configuration

- **Vite**: `vite.config.ts`
- **TypeScript**: `tsconfig.json`
- **Tailwind CSS**: `tailwind.config.js`
- **ESLint**: `.eslintrc.cjs`

## Features

### Current (MVP)

- ✅ Project creation and management
- ✅ Responsive mobile-first UI
- ✅ Project dashboard
- ✅ Navigation and layout
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ GitHub Actions CI

### Upcoming

- 🔄 Media upload and management
- 🔄 Media preview (images, videos, audio)
- 🔄 AI-powered editing assistance
- 🔄 Supabase backend integration
- 🔄 Authentication
- 🔄 Media processing and export
- 🔄 Real-time collaboration
- 🔄 Project sharing

## Contributing

This project is in active development. Please refer to GitHub issues for current work.

## License

MIT