# 🔗 Integration Guide - Adding Media to Your App

## Step 1: Import the Media Page Component

**File:** `client/src/App.tsx` or your main routing file

```typescript
import MediaLinks from '@/pages/media-links';
```

## Step 2: Add Route to Your Router

**If using React Router v6:**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MediaLinks from '@/pages/media-links';
import MediaManagement from '@/components/admin/media-management';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... other routes */}
        
        {/* Public Media Page */}
        <Route path="/media" element={<MediaLinks />} />
        <Route path="/our-media" element={<MediaLinks />} /> {/* Alternative URL */}
        
        {/* Admin Media Management */}
        <Route path="/admin/media" element={<MediaManagement />} />
        
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

**If using Wouter:**

```typescript
import { Router, Route } from 'wouter';
import MediaLinks from '@/pages/media-links';
import MediaManagement from '@/components/admin/media-management';

function App() {
  return (
    <Router>
      <Route path="/media" component={MediaLinks} />
      <Route path="/admin/media" component={MediaManagement} />
      {/* ... other routes */}
    </Router>
  );
}
```

## Step 3: Update Navigation Menu

Add link to your navigation:

```typescript
// components/navbar.tsx or similar

<nav>
  {/* ... other nav items */}
  
  <a href="/media" className="nav-link">
    Our Media
  </a>
  
  {/* Admin only */}
  {isAdmin && (
    <a href="/admin/media" className="nav-link">
      Media Management
    </a>
  )}
</nav>
```

Or in a footer:

```typescript
// components/footer.tsx

<footer>
  {/* ... footer content */}
  
  <div className="footer-section">
    <h4>Resources</h4>
    <ul>
      <li><a href="/media">Our Media</a></li>
      <li><a href="/blog">Blog</a></li>
      {/* ... other links */}
    </ul>
  </div>
</footer>
```

## Step 4: Add to Admin Dashboard

**File:** `client/src/components/admin/dashboard.tsx` or similar

```typescript
import MediaManagement from '@/components/admin/media-management';

function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      {/* ... other admin sections */}
      
      <section>
        <h2>Media Management</h2>
        <MediaManagement />
      </section>
    </div>
  );
}
```

Or as a tab:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MediaManagement from '@/components/admin/media-management';

function AdminPanel() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
      </TabsList>
      
      <TabsContent value="media">
        <MediaManagement />
      </TabsContent>
    </Tabs>
  );
}
```

## Step 5: Update Navigation Links

### In Header/Navigation:

```typescript
const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Media', href: '/media' },  // Add this
  { label: 'Blog', href: '/blog' },
  // ... other links
];
```

### In Breadcrumb:

```typescript
<Breadcrumb>
  <BreadcrumbItem>
    <a href="/">Home</a>
  </BreadcrumbItem>
  <BreadcrumbSeparator />
  <BreadcrumbItem>
    <a href="/media">Our Media</a>
  </BreadcrumbItem>
</Breadcrumb>
```

## Step 6: Add to Admin Sidebar

```typescript
// components/admin/sidebar.tsx

const adminMenuItems = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard />,
    href: '/admin'
  },
  {
    label: 'Products',
    icon: <Package />,
    href: '/admin/products'
  },
  {
    label: 'Media',           // Add this
    icon: <Image />,          // Use appropriate icon
    href: '/admin/media'
  },
  {
    label: 'Users',
    icon: <Users />,
    href: '/admin/users'
  },
  // ... other menu items
];
```

## Step 7: Update Layout Component (if needed)

If you have a shared layout component:

```typescript
// components/layout.tsx

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

Then use it:

```typescript
<Route path="/media" element={
  <Layout>
    <MediaLinks />
  </Layout>
} />
```

## Step 8: (Optional) Add Quick Links Section

Add a "Featured Media" section to homepage:

```typescript
// pages/home.tsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [featuredMedia, setFeaturedMedia] = useState([]);

  useEffect(() => {
    fetch('/api/media?category=featured&isActive=true')
      .then(res => res.json())
      .then(data => setFeaturedMedia(data.slice(0, 3)));
  }, []);

  return (
    <div>
      {/* ... other home content */}
      
      {/* Featured Media Section */}
      <section className="my-12">
        <h2>Latest Media</h2>
        <div className="grid grid-cols-3 gap-4">
          {featuredMedia.map(media => (
            <div key={media.id} className="cursor-pointer">
              <img src={media.imageUrl} alt={media.title} />
              <h3>{media.title}</h3>
            </div>
          ))}
        </div>
        <Link to="/media" className="btn btn-primary mt-4">
          View All Media
        </Link>
      </section>
    </div>
  );
}
```

## Step 9: Database Migration

```bash
# Run the migration
psql -d your_database_name -f migrations/0002_create_media_links.sql

# Or using npm
npm run db:push
```

## Step 10: Restart Your Application

```bash
# Stop the current server (Ctrl+C)

# Start the server again
npm run dev
```

## Testing the Integration

### Check Admin Page:
1. Navigate to `http://localhost:3000/admin/media`
2. Create a test media item
3. Verify it appears in the grid

### Check Public Page:
1. Navigate to `http://localhost:3000/media`
2. Verify the media appears
3. Click on a media item
4. Should redirect to the URL
5. Check click count increased

### Check Navigation:
1. Verify navigation links work
2. Check breadcrumb updates
3. Admin menu shows Media option

## Common Issues & Solutions

### Issue: Admin page shows 401 Unauthorized
**Solution:** Ensure you're logged in as admin. Check that `adminMiddleware` is properly configured in `server/routes.ts`

### Issue: Images not showing on media page
**Solution:** 
- Verify image URLs are publicly accessible
- Check browser console for CORS errors
- Try a different image URL

### Issue: Redirect not working
**Solution:**
- Ensure redirect URL has full http/https
- Check browser allows popup redirects
- Try opening in new tab

### Issue: Database migration fails
**Solution:**
- Verify PostgreSQL is running
- Check database user has CREATE TABLE permission
- Ensure correct database connection string

### Issue: Routes not defined
**Solution:**
- Verify `mediaLinks` is imported in `routes.ts`
- Check `/api/admin/media` endpoint returns 200
- Review server logs for errors

## File Structure After Integration

```
project/
├── client/src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── media-management.tsx      ← Admin component
│   │   │   └── sidebar.tsx                ← Updated with Media link
│   │   ├── layout.tsx                     ← May need update
│   │   ├── navbar.tsx                     ← Updated with Media link
│   │   └── footer.tsx                     ← May add Media link
│   ├── pages/
│   │   ├── media-links.tsx               ← Public media page
│   │   ├── home.tsx                       ← May add featured media section
│   │   └── App.tsx                        ← Router updated
│   └── ...
├── server/
│   ├── routes.ts                          ← Media routes added
│   └── ...
├── shared/
│   └── schema.ts                          ← mediaLinks table added
├── migrations/
│   └── 0002_create_media_links.sql        ← Database schema
└── ...
```

## Environment Variables (if needed)

Add to `.env`:

```env
# Media Management (optional)
MEDIA_UPLOAD_PATH=/uploads/media
MEDIA_MAX_FILE_SIZE=5242880  # 5MB
```

## Next Steps

1. ✅ Complete integration
2. 📊 Add media items via admin panel
3. 📈 Monitor click analytics
4. 🎨 Customize styling
5. 🚀 Deploy to production

## Additional Customization

### Change Media URL:
Replace `/media` with `/our-media` or `/press-room` anywhere needed

### Change Category Names:
Update default categories in admin form dropdown

### Add More Fields:
Extend schema in `shared/schema.ts` and database

### Customize Styling:
Edit classes in `media-management.tsx` and `media-links.tsx`

---

**Integration Complete!** 🎉

Your media management system is now integrated and ready to use.
