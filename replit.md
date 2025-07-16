# Investment Approval Portal

## Overview

This is a full-stack investment approval portal built with React, TypeScript, Express, and PostgreSQL for ABCBank. The application manages investment requests, cash requests, and approval workflows with role-based access control and document management capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for client-side routing
- **Form Management**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom plugins for development

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Authentication**: Session-based auth with bcrypt for password hashing
- **File Upload**: Multer for handling file uploads
- **API Design**: RESTful endpoints with consistent error handling

## Key Components

### Database Schema
- **Users**: Role-based system (analyst, manager, committee_member, finance, admin)
- **Investment Requests**: Full investment proposal lifecycle
- **Cash Requests**: Linked to approved investments
- **Approvals**: Multi-stage approval workflow tracking
- **Tasks**: Assignment and tracking system
- **Documents**: File attachment system
- **Notifications**: Real-time user notifications
- **Templates**: Reusable form templates
- **Audit Logs**: Complete action history

### Authentication & Authorization
- Session-based authentication with middleware protection
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Protected routes on both frontend and backend

### Approval Workflow System
- Multi-stage approval process
- Role-based approval routing
- SLA tracking and deadline management
- Task assignment and notifications
- Status tracking (pending, approved, rejected, changes_requested)

### File Management
- Multer-based file upload system
- Support for documents, images, and spreadsheets
- File type validation and size limits
- Document linking to requests

## Data Flow

1. **User Authentication**: Users log in through session-based auth
2. **Request Creation**: Analysts create investment/cash requests
3. **Workflow Initiation**: System automatically starts approval workflow
4. **Task Assignment**: Approvers receive tasks based on their role
5. **Approval Process**: Multi-stage approval with comments and document support
6. **Notification System**: Real-time updates to all stakeholders
7. **Status Tracking**: Complete audit trail of all actions

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **bcrypt**: Password hashing
- **multer**: File upload handling

### Development Dependencies
- **vite**: Build tool and dev server
- **@replit/vite-plugin-runtime-error-modal**: Error overlay
- **@replit/vite-plugin-cartographer**: Development tooling
- **tailwindcss**: Styling framework
- **typescript**: Type safety

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Database: Drizzle migrations in `migrations/` directory

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Environment setting (development/production)
- Session configuration for authentication

### Production Deployment
- Single process serving both API and static files
- PostgreSQL database (Neon or compatible)
- File upload directory configuration
- Session store configuration

## Theming System

The application uses a comprehensive CSS custom properties-based theming system to support multiple themes without hard-coded colors:

### Available Themes
- **Light Theme**: Clean appearance with bluish accents and black text for professional readability
- **Dark Theme**: High contrast dark mode for reduced eye strain with light text on dark backgrounds

### Implementation Details
- All colors defined as HSL values in CSS custom properties
- Theme switching via ThemeContext provider and useTheme hook
- Themes applied through CSS classes on document root
- Tailwind CSS configured to use CSS custom properties
- Theme toggle component in header for runtime switching

### Color System
- Primary, secondary, accent, success, warning, info, destructive color groups
- Each group includes foreground variants for optimal contrast
- Chart colors defined for data visualization consistency
- All status badges and UI elements use theme-aware colors

## Changelog

- July 08, 2025. Initial setup
- July 08, 2025. Implemented flexible theming system with light, dark, and corporate themes
- July 08, 2025. Updated branding from Tawuniya to ABCBank throughout application
- July 10, 2025. Fixed file download and preview functionality - resolved route ordering conflict and ES module import issues
- July 10, 2025. Updated task description format to show "request id - asset type - target company - amount - status"
- July 10, 2025. Enhanced document management with working preview dialog and download capabilities
- July 11, 2025. Enhanced header to display user's name and role below avatar icon
- July 11, 2025. Implemented role-based access control for analysts - they can only see their own proposals
- July 11, 2025. Created second analyst user (analyst2/admin123) for testing multi-user scenarios
- July 11, 2025. Fixed database filtering logic to properly restrict analyst access to their own investment requests
- July 11, 2025. Fixed rejection workflow to properly route all rejected proposals back to originating analyst
- July 11, 2025. Enhanced filtering logic to ensure rejected proposals are visible to analysts and admins only
- July 13, 2025. Fixed mobile hamburger menu - now properly closes when navigation items are clicked by connecting to controlled Sheet state
- July 14, 2025. Implemented automated document analysis and classification system using Anthropic Claude API
- July 14, 2025. Added comprehensive document analysis features including AI-powered classification, risk assessment, key information extraction, and intelligent recommendations
- July 14, 2025. Enhanced document management with analysis status tracking, confidence scoring, and batch processing capabilities
- July 14, 2025. Integrated document analysis into investment proposal workflow with real-time insights and automated processing
- July 14, 2025. Fixed document analysis completion issue - documents were getting stuck in "processing" status even after successful analysis. Added force-complete endpoint and fixed status updates
- July 14, 2025. Implemented real OpenAI Vector Store API integration with automatic document upload functionality - documents uploaded to investment proposals are now automatically added to vector store for searchability
- July 14, 2025. Increased file upload size limit from 10MB to 50MB to support larger documents like annual reports and comprehensive investment research files
- July 14, 2025. Implemented vector store-based document analysis system - replaced traditional text extraction with OpenAI Vector Store queries for superior document processing and insight generation
- July 15, 2025. Enhanced document analysis robustness with improved error handling, fallback systems, and retry mechanisms to handle OpenAI API timeouts and server errors
- July 15, 2025. Implemented manual document analysis trigger system - replaced unreliable automatic processing with user-controlled manual analysis buttons for better reliability and control
- July 15, 2025. Restructured document analysis to use OpenAI Vector Store exclusively - removed all local PDF processing and OCR code, implemented streamlined vector store workflow with file upload verification, assistant-based querying, and structured analysis results
- July 15, 2025. Added document analysis functionality to approval workflow - approvers can now analyze supporting documents directly from the task view with "Analyze" button alongside Preview/Download, displaying AI-powered insights including document type, risk assessment, key amounts, and recommendations
- July 15, 2025. Successfully implemented "Prepare for AI" functionality using OpenAI file_batches.createAndPoll() method based on working Python code reference. Fixed parameter passing issues by replacing individual file upload with batch processing approach. Vector store preparation now working reliably with automatic polling and status updates
- July 15, 2025. Successfully implemented complete Stage 3 "Get Insights" functionality using OpenAI Assistants API with file_search tool connected to vector store. Created GetInsightsService with persistent assistant caching for improved performance. Added "Get Insights" button to DocumentAnalysisCard component that generates both summary and insights using user-provided Python code prompts. Full 3-stage AI workflow now operational: Upload → Prepare for AI → Get Insights
- July 16, 2025. Implemented hybrid background job system for document processing - analysts get automatic document processing via background jobs when creating proposals, while managers/approvers get manual "Prepare for AI" buttons for on-demand analysis during approval process. Created comprehensive background job service with retry logic, sequential processing, and fallback mechanisms. System tested with real documents (15-26 MB annual reports) and confirmed operational with 10-second polling interval and 3-attempt retry system. All phases passed testing: background queue system, role-based UI logic, multiple document handling, and real document processing.

## User Preferences

Preferred communication style: Simple, everyday language.
Key requirement: NO hard-coded CSS or colors - all styling must support multiple themes through CSS custom properties.