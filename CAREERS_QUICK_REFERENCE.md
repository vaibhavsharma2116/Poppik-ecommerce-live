# 🚀 Careers Page - Quick Reference Guide

## API Data Format at a Glance

### Endpoint
```
GET /api/job-positions
Returns: Array<JobPosition>
Status: 200 OK
```

### Response Example
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
    "description": "Join us as a Senior Frontend Developer...",
    "aboutRole": "We are building the next generation of UI...",
    "responsibilities": [
      "Lead frontend development",
      "Mentor junior developers",
      "Design responsive interfaces"
    ],
    "requirements": [
      "5+ years experience",
      "React expertise",
      "TypeScript proficiency"
    ],
    "skills": [
      "React.js",
      "TypeScript",
      "TailwindCSS"
    ],
    "isActive": true,
    "expiresAt": null,
    "sortOrder": 1,
    "createdAt": "2025-11-27T10:00:00Z",
    "updatedAt": "2025-11-27T10:00:00Z"
  }
]
```

## Data Field Types

| Field | Type | Example |
|-------|------|---------|
| id | number | 1 |
| title | string | "Senior Frontend Developer" |
| slug | string | "senior-frontend-developer" |
| department | string | "Engineering" |
| location | string | "Bangalore" |
| type | string | "Full-time" |
| experienceLevel | string | "Senior" |
| workExperience | string | "5+ years" |
| education | string | "Bachelor's in CS" |
| description | string | Job description |
| aboutRole | string | Detailed role info |
| responsibilities | array | List of responsibilities |
| requirements | array | List of requirements |
| skills | array | List of required skills |
| isActive | boolean | true/false |
| sortOrder | number | Display order |
| createdAt | ISO timestamp | 2025-11-27T10:00:00Z |
| updatedAt | ISO timestamp | 2025-11-27T10:00:00Z |

## Frontend Implementation

### useQuery Setup
```javascript
const { data: openPositions = [], isLoading } = useQuery({
  queryKey: ['job-positions'],
  queryFn: async () => {
    const response = await fetch('/api/job-positions');
    return response.json();
  },
  staleTime: 5 * 60 * 1000,      // 5 minutes
  gcTime: 10 * 60 * 1000,         // 10 minutes
});
```

### Extract Unique Values
```javascript
const departments = ["all", ...new Set(openPositions.map(p => p.department))];
const locations = ["all", ...new Set(openPositions.map(p => p.location))];
```

### Apply Filters
```javascript
let filtered = openPositions;
if (selectedDept !== 'all') {
  filtered = filtered.filter(p => p.department === selectedDept);
}
if (selectedLoc !== 'all') {
  filtered = filtered.filter(p => p.location === selectedLoc);
}
```

## Display States

### 🔄 Loading
```
Loading job positions...
```

### 📭 Empty
```
No positions found matching your criteria.
```

### ✅ Success
Shows cards with:
- Job title
- Department badge (pink)
- Location badge (blue)
- Job type badge (green)
- Description
- "View Details" button

## Console Debugging

Watch for these logs:
```
🔍 Fetching job positions from API...
✅ API Response Status: 200
📊 Raw API Data received: [...]
📈 Data length: 5
🏢 Available departments: [...]
📍 Available locations: [...]
✅ Successfully processed 5 positions
```

## Admin API Endpoints

### List All (including inactive)
```
GET /api/admin/job-positions
Authorization: Bearer {token}
```

### Create Position
```
POST /api/admin/job-positions
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Job Title",
  "slug": "job-title",
  "department": "Engineering",
  "location": "Bangalore",
  "type": "Full-time",
  "experienceLevel": "Senior",
  "workExperience": "5+ years",
  "education": "Bachelor's degree",
  "description": "Description",
  "aboutRole": "About this role",
  "responsibilities": ["Resp 1", "Resp 2"],
  "requirements": ["Req 1", "Req 2"],
  "skills": ["Skill 1", "Skill 2"],
  "isActive": true
}
```

### Update Position
```
PUT /api/admin/job-positions/:id
Authorization: Bearer {token}
Content-Type: application/json

Body: (partial update - only send changed fields)
```

### Delete Position
```
DELETE /api/admin/job-positions/:id
Authorization: Bearer {token}
```

## Filter Behavior

### Department Filter
- Shows all departments from active positions
- Default: "All Departments"
- Updates position count when changed

### Location Filter
- Shows all locations from active positions
- Default: "All Locations"
- Updates position count when changed

### Combined Filters
- AND logic: Position must match BOTH filters
- Count updates dynamically
- Shows "No positions found" if no matches

## Common Issues & Solutions

### ❌ Issue: "No positions found"
**Solution:**
1. Check DB has positions with `isActive = true`
2. Verify department and location are populated
3. Use `/api/debug/job-positions` to see all data
4. Refresh page and check console

### ❌ Issue: Filters empty
**Solution:**
1. Ensure positions exist in DB
2. Check if API returns data
3. Verify departments/locations have values
4. Check for null/empty strings in DB

### ❌ Issue: JSON Parse errors
**Solution:**
1. Check console for parse errors
2. Verify JSONB columns format in DB
3. Re-create position through admin panel
4. Check field values are valid JSON

### ❌ Issue: Slow loading
**Solution:**
1. Data cached 5 minutes - clear cache manually
2. Check network tab for slow API response
3. Verify database query performance
4. Check if too many positions (paginate if needed)

## Debugging Tips

1. **Open DevTools Console** (F12)
2. **Search for logs starting with:** 🔍 📊 ✅ ❌
3. **Check Network tab** for `/api/job-positions` request
4. **Verify response JSON** is valid array
5. **Test filters** by selecting values
6. **Check page source** for rendered HTML

## Performance Notes

- Data cached for 5 minutes
- Filtered on frontend (no backend pagination)
- Best for < 100 positions
- For more positions, add pagination in API

## Browser Compatibility

✅ Chrome/Edge (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Mobile browsers

## Migration & Setup

### If positions not showing:
1. Verify migration ran: `migrations/0004_create_job_positions.sql`
2. Check table exists in DB
3. Ensure admin can create positions
4. Verify API endpoint works: `curl http://localhost:8085/api/job-positions`

---

**Quick Links:**
- 📖 Full API Docs: `CAREERS_API_DATA_FORMAT.md`
- 📊 Data Flow: `CAREERS_DATA_FLOW_VISUAL.md`
- 🔧 Admin Panel: `/admin/careers` (admin only)
- 📄 Frontend: `/careers` (public)

**Last Updated:** November 27, 2025
