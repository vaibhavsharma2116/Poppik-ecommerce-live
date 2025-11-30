# Poppik E-Commerce Platform

## Overview

Poppik is a comprehensive e-commerce platform for beauty and cosmetics products, built with a modern tech stack featuring React, Express, PostgreSQL, and Drizzle ORM. The platform supports product management, order processing, affiliate programs, media management, and advanced features like push notifications and social media sharing optimization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- **React 18** with TypeScript for type-safe component development
- **Vite** for fast development and optimized production builds
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management and caching

**UI & Styling**
- **Tailwind CSS** with custom theme configuration for responsive design
- **Radix UI** components for accessible, unstyled primitives
- **shadcn/ui** component library integrated via components.json
- Custom font: Poppins from Google Fonts

**State Management Patterns**
- Server state managed via TanStack Query with aggressive caching
- Local state using React hooks
- User authentication state persisted in localStorage
- Query client configured with custom error handling and retry logic

**Performance Optimizations**
- Lazy loading for route-based code splitting
- Image optimization utilities with WebP support
- Batched fetch requests to prevent duplicate network calls
- Service Worker for offline capabilities and push notifications
- Aggressive compression and minification in production builds

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for type-safe API development
- Middleware stack: Helmet (security), CORS, Compression
- Rate limiting implemented (100 req/min general, 1000 req/min admin)
- Admin authentication via JWT tokens

**Database Layer**
- **PostgreSQL** as primary data store
- **Drizzle ORM** for type-safe database queries and migrations
- Schema-first approach with shared TypeScript types
- Connection pooling via node-postgres (pg)

**API Design**
- RESTful endpoints under `/api/*` namespace
- Structured error handling with appropriate HTTP status codes
- File upload handling via multer with sharp for image processing
- Separate route handlers for admin, performance monitoring, and master admin functions

**Authentication & Authorization**
- JWT-based authentication with bcrypt password hashing
- Role-based access control (user, admin, master_admin)
- Admin middleware validates tokens and role permissions
- OTP service for mobile verification via SMS gateway

**Key Services**
- **OTP Service**: SMS-based verification using MDSSEND.IN gateway
- **Shiprocket Integration**: Order fulfillment and shipping management
- **Push Notifications**: Web Push API with VAPID keys
- **Email Service**: Nodemailer for transactional emails

### Data Models

**Core Entities**
- Users (authentication, profile, roles)
- Products (catalog with variants, shades, images)
- Categories & Subcategories (hierarchical organization)
- Orders & Order Items (transaction records)
- Reviews & Testimonials (user feedback)
- Media Links (gallery with redirect tracking)

**Commerce Features**
- Product shades/variants with dedicated images
- Affiliate program (codes, commissions, wallet system)
- Cashback system with balance tracking
- Blog posts with categories and subcategories
- Job positions and applications

**Media & Content**
- Sliders (homepage carousels)
- Announcements (rotating banner messages)
- Video testimonials (UGC content)
- Category-specific sliders

### Performance & Monitoring

**Database Optimization**
- Query performance monitoring via pg_stat_statements
- Active connection tracking and management
- Emergency cleanup procedures for high CPU usage
- Automated blocking query detection

**Resource Management**
- CPU monitoring with automatic process termination for runaway queries
- Memory limits configured (512MB for production)
- Process-level optimizations (max listeners, graceful shutdown)

**Caching Strategy**
- Server-rendered OG tags cached for 1 hour
- TanStack Query client-side caching
- Static asset caching via Vite build

### Social Media Integration

**Open Graph Optimization**
- Server-side OG tag rendering for social media crawlers
- Bot detection for WhatsApp, Facebook, Twitter, LinkedIn, etc.
- Dynamic product image resolution with shade support
- Meta refresh redirect for regular browsers to maintain React SPA experience

**Push Notifications**
- Service Worker registration for web push
- VAPID key-based subscription management
- Multi-platform notification support

## External Dependencies

### Third-Party Services

**Payment Processing**
- Stripe (via @stripe/stripe-js)
- Cashfree Payments (custom integration)

**Communications**
- SMS Gateway: MDSSEND.IN for OTP delivery
- Email: Nodemailer for transactional messages
- WhatsApp Business integration (link-based)

**Shipping & Logistics**
- Shiprocket API for order fulfillment

**Cloud & Infrastructure**
- Replit Object Storage (@replit/object-storage)
- Potential deployment on Replit infrastructure

### Development Dependencies

**Build & Dev Tools**
- esbuild for server bundling
- tsx for TypeScript execution
- drizzle-kit for database migrations
- cross-env for environment variables

**UI Component Libraries**
- @radix-ui/* (20+ component packages)
- @tiptap/* for rich text editing
- lucide-react for icons

**Utilities**
- sharp for image processing
- nanoid for unique ID generation
- zod for runtime validation
- clsx & tailwind-merge for class name handling

### Database

**PostgreSQL Configuration**
- Local development: postgresql://postgres:postgres@localhost:5432/poppik_local
- Production: Configured via DATABASE_URL environment variable
- No SSL for local, SSL configurable for production

**Migration System**
- Drizzle Kit for schema management
- SQL migrations stored in /migrations directory
- Manual execution via psql for deployment

### Environment Variables

**Required Configuration**
- DATABASE_URL (PostgreSQL connection)
- JWT_SECRET (authentication signing key)
- VITE_VAPID_PUBLIC_KEY (push notifications)
- VITE_API_BASE (optional, for API proxy in development)

**Optional Services**
- Stripe keys
- Cashfree credentials
- SMS gateway credentials
- Email service configuration