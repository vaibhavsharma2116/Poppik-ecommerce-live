# Careers Page - API Data Format Guide

## Overview
The careers page now displays job positions with proper data formatting and detailed logging for debugging.

## API Endpoint
**URL:** `/api/job-positions`  
**Method:** GET  
**Authentication:** Not required

## Response Format

### Success Response (200 OK)
```json
[
  {
    "id": 1,
    "title": "Senior Frontend Developer",
    "slug": "senior-frontend-developer",
    "department": "Engineering",
    "location": "Bangalore",
    "type": "Full-time",
    "jobId": "ENG-001",
    "experienceLevel": "Senior",
    "workExperience": "5+ years",
    "education": "Bachelor's in Computer Science",
    "description": "We're looking for a talented Senior Frontend Developer to join our team...",
    "aboutRole": "In this role, you will be responsible for...",
    "responsibilities": [
      "Lead frontend development initiatives",
      "Mentor junior developers",
      "Design and implement responsive UIs"
    ],
    "requirements": [
      "5+ years of frontend development experience",
      "Expert in React and TypeScript",
      "Experience with TailwindCSS or similar"
    ],
    "skills": [
      "React.js",
      "TypeScript",
      "TailwindCSS",
      "REST APIs"
    ],
    "isActive": true,
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "sortOrder": 1,
    "createdAt": "2025-11-27T10:30:00.000Z",
    "updatedAt": "2025-11-27T10:30:00.000Z"
  }
]
```

## Data Types

| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique position ID |
| title | string | Job title |
| slug | string | URL-friendly slug |
| department | string | Department name (e.g., Engineering, Sales) |
| location | string | Job location (e.g., Bangalore, Mumbai) |
| type | string | Employment type (Full-time, Part-time, Contract) |
| jobId | string | Internal job reference ID |
| experienceLevel | string | Experience level (Junior, Mid, Senior) |
| workExperience | string | Required work experience (e.g., "3+ years") |
| education | string | Educational requirement |
| description | string | Short description of the role |
| aboutRole | string | Detailed description about the role |
| responsibilities | array | Array of job responsibilities |
| requirements | array | Array of job requirements |
| skills | array | Array of required skills |
| isActive | boolean | Whether position is accepting applications |
| expiresAt | timestamp | Position expiration date |
| sortOrder | number | Display order |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update date |

## Frontend Data Processing

### Query Configuration
- **Query Key:** `['job-positions']`
- **Stale Time:** 5 minutes
- **Cache Time:** 10 minutes

### Data Transformation
The frontend automatically:
1. Parses JSON string fields (responsibilities, requirements, skills)
2. Handles both string and array formats
3. Provides error handling and fallbacks
4. Logs detailed debug information

### Console Logging

The page logs detailed information to help debug:

```
🔍 Fetching job positions from API...
✅ API Response Status: 200
📊 Raw API Data received: [...]
📝 Data type: object
📋 Is Array?: true
📈 Data length: 5

🏢 Available departments: ["all", "Engineering", "Sales", "Support"]
📍 Available locations: ["all", "Bangalore", "Mumbai", "Delhi"]

📌 Processing position: Senior Frontend Developer
✓ Parsed responsibilities for Senior Frontend Developer
✓ Parsed requirements for Senior Frontend Developer
✓ Parsed skills for Senior Frontend Developer

✅ Successfully processed 5 positions
🎯 Final formatted data: {...}
```

## Filter Logic

### Department Filter
- Shows all unique departments from active positions
- Filters positions by selected department
- Default: "All Departments"

### Location Filter
- Shows all unique locations from active positions
- Filters positions by selected location
- Default: "All Locations"

### Combined Filters
- Both filters work together
- Positions must match both department AND location to appear
- Count updates dynamically

## Debugging

### If No Positions Show
1. **Check API Response:** Open DevTools Console
2. **Verify Data:** Look for "📊 Raw API Data received" log
3. **Check Parsing:** Look for "✓ Parsed" or "⚠️ Failed to parse" logs
4. **Database Check:** Run `/api/debug/job-positions` for all positions

### Common Issues

**Issue:** "No positions found matching your criteria"
- **Cause:** API returned empty array
- **Solution:** 
  - Verify positions exist in database
  - Check isActive flag is true
  - Use admin panel to create/activate positions

**Issue:** Filters not showing options
- **Cause:** No unique departments or locations
- **Solution:**
  - Add positions with different departments/locations
  - Verify data in database

**Issue:** JSON Parse errors in console
- **Cause:** Malformed JSONB data in database
- **Solution:**
  - Check database directly
  - Recreate positions through admin panel

## Example API Call

```javascript
// Fetch active job positions
const response = await fetch('/api/job-positions');
const positions = await response.json();

// Log for debugging
console.log('Total positions:', positions.length);
console.log('Departments:', [...new Set(positions.map(p => p.department))]);
console.log('Locations:', [...new Set(positions.map(p => p.location))]);
```

## Admin API Endpoints

### Get All Positions (Admin)
```
GET /api/admin/job-positions
Authorization: Bearer {admin_token}
```

### Create Position (Admin)
```
POST /api/admin/job-positions
Authorization: Bearer {admin_token}

Body:
{
  "title": "Job Title",
  "slug": "job-title",
  "department": "Engineering",
  "location": "Bangalore",
  "type": "Full-time",
  "experienceLevel": "Senior",
  "workExperience": "5+ years",
  "education": "Bachelor's degree",
  "description": "Short description",
  "aboutRole": "Detailed description",
  "responsibilities": ["Resp 1", "Resp 2"],
  "requirements": ["Req 1", "Req 2"],
  "skills": ["Skill 1", "Skill 2"],
  "isActive": true
}
```

### Update Position (Admin)
```
PUT /api/admin/job-positions/:id
Authorization: Bearer {admin_token}

Body: (same as create, only provided fields are updated)
```

## Database Schema

```typescript
export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  department: varchar("department", { length: 100 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  jobId: varchar("job_id", { length: 50 }).unique(),
  experienceLevel: varchar("experience_level", { length: 50 }).notNull(),
  workExperience: varchar("work_experience", { length: 50 }).notNull(),
  education: varchar("education", { length: 200 }).notNull(),
  description: text("description").notNull(),
  aboutRole: text("about_role").notNull(),
  responsibilities: jsonb("responsibilities").notNull(),
  requirements: jsonb("requirements").notNull(),
  skills: jsonb("skills").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## Features Added

✅ Detailed console logging for debugging  
✅ Proper JSONB parsing with error handling  
✅ Dynamic filter population from data  
✅ Department and location filtering  
✅ Loading state display  
✅ Empty state messaging  
✅ Position count display  
✅ Responsive design  
✅ Active/Inactive status handling  

---

**Last Updated:** November 27, 2025
