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

## User Preferences

Preferred communication style: Simple, everyday language.
Key requirement: NO hard-coded CSS or colors - all styling must support multiple themes through CSS custom properties.