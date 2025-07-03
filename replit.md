# Semantic Similarity Analysis Tool

## Overview

This is a full-stack web application that provides semantic similarity analysis between keywords and text content using OpenAI's text-embedding-3 model. The tool helps users optimize their content for better SEO by comparing their copy against competitor content and measuring semantic alignment with target keywords.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Hook Form for form state, TanStack Query for server state
- **Build Tool**: Vite with Hot Module Replacement (HMR)
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JSON communication
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Logging**: Custom request/response logging middleware

### Database Strategy
- **Approach**: Stateless, no persistent storage
- **Rationale**: Security-first design - user API keys and content are never persisted
- **Data Flow**: All processing happens in memory during request lifecycle

## Key Components

### Analysis Engine
- **Embedding Generation**: Uses OpenAI's text-embedding-3-small model
- **Similarity Calculation**: Cosine similarity between keyword centroids and content embeddings
- **Processing Modes**: 
  - Full document analysis (default)
  - Chunked analysis for detailed insights
- **Keyword Weighting**: Supports weighted keywords (e.g., "SEO:3, content:2")

### Security Features
- **API Key Handling**: Session-only storage, validation with 'sk-' prefix
- **Input Validation**: Zod schemas for request validation
- **Content Limits**: 4,000 word limit per text input, 50 keyword maximum

### User Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Form Management**: Real-time validation and parsing feedback
- **Results Visualization**: Progress bars, gap analysis, and export capabilities
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## Data Flow

1. **Input Processing**: User submits API key, keywords, and content through validated form
2. **Embedding Generation**: Server creates embeddings for keywords and content using OpenAI API
3. **Similarity Calculation**: Weighted keyword centroid compared against content embeddings
4. **Analysis Results**: Similarity scores, gap analysis, and recommendations returned to client
5. **Data Cleanup**: All sensitive data discarded after response

## External Dependencies

### Core Dependencies
- **OpenAI API**: text-embedding-3-small model for semantic embeddings
- **Neon Database**: PostgreSQL provider (configured but not actively used)
- **Drizzle ORM**: Database toolkit with PostgreSQL dialect

### UI Libraries
- **Radix UI**: Unstyled, accessible UI components
- **Lucide React**: Icon library
- **React Hook Form**: Form state management
- **TanStack Query**: Server state management

### Development Tools
- **TypeScript**: Static type checking
- **ESBuild**: Backend bundling
- **PostCSS**: CSS processing with Autoprefixer

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles server to `dist/index.js`
- **Assets**: Static assets served from build output

### Environment Configuration
- **Development**: Uses tsx for hot reloading and Vite dev server
- **Production**: Node.js serves bundled application
- **Database**: Requires `DATABASE_URL` environment variable (PostgreSQL connection string)

### Hosting Requirements
- Node.js runtime environment
- PostgreSQL database (Neon or compatible)
- Environment variables for database connection

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 03, 2025. Initial setup