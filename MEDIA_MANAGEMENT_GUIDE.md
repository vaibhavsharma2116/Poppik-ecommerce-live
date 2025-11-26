# Media Management System - Implementation Guide

## 📋 Overview

A complete media management system that allows admins to create, edit, and manage clickable media items with redirect URLs. Users can click on media to be redirected to specific URLs, with click tracking enabled.

## 🗂️ Files Created/Modified

### 1. **Database Schema** (`shared/schema.ts`)
- Added `mediaLinks` table with Drizzle ORM
- Includes fields for:
  - Title, description, image/video URLs
  - Redirect URL (where users are sent)
  - Category, type, sort order
  - Click count tracking
  - Active/inactive status
  - Validity dates (validFrom, validUntil)
  - Metadata for extensibility

### 2. **Database Migration** (`migrations/0002_create_media_links.sql`)
- Creates `media_links` table in PostgreSQL
- Creates indexes for performance optimization
- Includes detailed comments for maintainability

### 3. **Backend Routes** (`server/routes.ts`)

#### Public Routes:
- `GET /api/media` - Get all active media with filters
- `GET /api/media/:id` - Get single media item
- `POST /api/media/:id/click` - Track clicks and get redirect URL

#### Admin Routes (requires authentication):
- `GET /api/admin/media` - Get all media (paginated)
- `POST /api/admin/media` - Create new media
- `PUT /api/admin/media/:id` - Update media
- `DELETE /api/admin/media/:id` - Delete media
- `POST /api/admin/media/reorder` - Bulk update sort order

### 4. **Admin Management Page** (`components/admin/media-management.tsx`)
Features:
- Create/edit media items with form validation
- Image and redirect URL management
- Category and type selection
- Validity date range setting
- Sort order control
- Quick toggle for active/inactive status
- Click count analytics
- Thumbnail preview grid
- Delete confirmation dialog

### 5. **Public Media Page** (`pages/media-links.tsx`)
Features:
- Beautiful grid display of media items
- Category filtering
- Hover effects with overlay
- Click tracking integration
- View count display
- Featured section highlighting
- Responsive design (mobile, tablet, desktop)
- Loading states
- Error handling

## 🔧 Setup Instructions

### Step 1: Run Database Migration
```bash
# Using psql
psql -d your_database_name -f migrations/0002_create_media_links.sql

# Or using drizzle-kit
npm run db:push
```

### Step 2: Import Components in Routes
The backend routes are already added to `server/routes.ts`. Ensure the imports include:
```typescript
import { mediaLinks } from "../shared/schema";
```

### Step 3: Add Route to Frontend Navigation (Optional)
Add the media page to your routing configuration:
```typescript
import MediaLinks from '@/pages/media-links';

// In your router setup:
{
  path: '/media',
  component: MediaLinks
}
```

### Step 4: Add to Admin Dashboard
Import the media management component in your admin panel:
```typescript
import MediaManagement from '@/components/admin/media-management';

// In your admin routes:
{
  path: '/admin/media',
  component: MediaManagement,
  requiresAdmin: true
}
```

## 📊 Database Schema

### media_links Table
```sql
CREATE TABLE media_links (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  video_url TEXT,
  redirect_url TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'media',
  type VARCHAR(50) DEFAULT 'image',
  click_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes Created:
- `idx_media_links_is_active` - For filtering active media
- `idx_media_links_category` - For category filtering
- `idx_media_links_type` - For type filtering
- `idx_media_links_sort_order` - For ordering
- `idx_media_links_created_at` - For date filtering

## 🎨 Features

### Admin Panel Features:
✅ Create new media items with image/video support
✅ Edit existing media
✅ Delete media with confirmation
✅ Toggle active/inactive status
✅ Set validity dates
✅ Organize by category and type
✅ Sort order management
✅ Metadata support (for alt text, tags, etc.)
✅ Click count tracking
✅ Bulk operations support

### User-Facing Features:
✅ Responsive media grid layout
✅ Category filtering
✅ Hover animations and overlays
✅ Click tracking with analytics
✅ Video badge indication
✅ View count display
✅ Featured section highlighting
✅ Redirect link management
✅ Loading states

## 🔐 Security

- All admin routes require authentication via `adminMiddleware`
- Click tracking is public but anonymous
- Redirect URLs are configurable and tracked
- Admin-only edit/delete operations

## 📱 Responsive Design

- Mobile-first approach
- Tablet optimization
- Desktop grid layout (3 columns)
- Touch-friendly buttons
- Optimized images

## 🎯 Category Types

Default categories:
- `media` - General media
- `press` - Press releases/coverage
- `featured` - Featured highlights
- `news` - News items

## 📹 Media Types

Supported types:
- `image` - Static images
- `video` - Video content
- `carousel` - Image carousel

## 💾 Data Model

```typescript
interface MediaLink {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string;
  redirectUrl: string;
  category: string; // 'media', 'press', 'featured', 'news'
  type: string; // 'image', 'video', 'carousel'
  clickCount: number;
  isActive: boolean;
  sortOrder: number;
  validFrom?: string;
  validUntil?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}
```

## 🚀 API Usage Examples

### Fetch All Active Media
```bash
curl -X GET "http://localhost:3000/api/media?isActive=true&category=media"
```

### Create Media (Admin)
```bash
curl -X POST "http://localhost:3000/api/admin/media" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin-token]" \
  -d '{
    "title": "Press Release",
    "description": "Our latest news",
    "imageUrl": "https://example.com/image.jpg",
    "redirectUrl": "https://example.com/article",
    "category": "press",
    "type": "image",
    "isActive": true
  }'
```

### Track Click
```bash
curl -X POST "http://localhost:3000/api/media/1/click" \
  -H "Content-Type: application/json"
```

### Update Media (Admin)
```bash
curl -X PUT "http://localhost:3000/api/admin/media/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin-token]" \
  -d '{
    "title": "Updated Title",
    "clickCount": 10,
    "isActive": false
  }'
```

### Delete Media (Admin)
```bash
curl -X DELETE "http://localhost:3000/api/admin/media/1" \
  -H "Authorization: Bearer [admin-token]"
```

## 📊 Analytics & Tracking

- Click count is automatically incremented when users click media
- Track engagement with click data
- View temporal patterns with created_at timestamps
- Filter by category to analyze specific media performance

## 🐛 Troubleshooting

### Images Not Loading
- Ensure image URLs are publicly accessible
- Check CORS settings if images are from external sources
- Fallback placeholder image is provided

### Click Not Tracking
- Verify admin middleware is properly configured
- Check database connectivity
- Ensure POST request is sent to `/api/media/:id/click`

### Migration Not Running
- Use correct database credentials
- Ensure user has CREATE TABLE permissions
- Check PostgreSQL version compatibility

## 🔄 Future Enhancements

- [ ] Batch upload functionality
- [ ] Advanced analytics dashboard
- [ ] A/B testing for different media
- [ ] Automated image optimization
- [ ] Video hosting integration
- [ ] Social media integration
- [ ] Schedule media visibility
- [ ] User-generated content approval workflow

## 📚 Related Files

- Schema: `shared/schema.ts`
- Backend Routes: `server/routes.ts`
- Admin Component: `client/src/components/admin/media-management.tsx`
- Public Page: `client/src/pages/media-links.tsx`
- Migration: `migrations/0002_create_media_links.sql`

## ✅ Verification Checklist

- [ ] Migration file created: `0002_create_media_links.sql`
- [ ] Schema updated in `shared/schema.ts`
- [ ] Routes added in `server/routes.ts`
- [ ] Admin component created: `media-management.tsx`
- [ ] Public page created: `media-links.tsx`
- [ ] Database migration executed
- [ ] Admin page accessible at `/admin/media`
- [ ] Public page accessible at `/media`
- [ ] Click tracking working
- [ ] Category filtering working

## 📞 Support

For issues or questions:
1. Check the migration file syntax
2. Verify all imports are correct
3. Test API endpoints with curl
4. Check browser console for errors
5. Review database logs
