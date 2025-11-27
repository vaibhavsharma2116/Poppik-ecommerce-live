# 📊 Careers Page - Data Flow & Format Guide

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE (PostgreSQL)                      │
│                     job_positions TABLE                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • id (Serial PK)                                        │   │
│  │ • title, slug, department, location, type              │   │
│  │ • responsibilities (JSONB) ← JSON Array                │   │
│  │ • requirements (JSONB) ← JSON Array                    │   │
│  │ • skills (JSONB) ← JSON Array                          │   │
│  │ • isActive (Boolean) ← Only true positions shown       │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API ENDPOINT                                  │
│                 GET /api/job-positions                           │
│                 (Only returns isActive=true)                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Response: Array of job position objects                │   │
│  │ Status: 200 OK                                          │   │
│  │ Format: Application/JSON                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│           REACT QUERY (Frontend Data Management)                 │
│                                                                  │
│  useQuery({                                                      │
│    queryKey: ['job-positions'],                                 │
│    queryFn: () => fetch('/api/job-positions').then(r=>r.json()) │
│    staleTime: 5 minutes                                         │
│  })                                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Returns: openPositions array                            │   │
│  │ Status: isLoading, error, data                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│      DATA TRANSFORMATION (JSON Parsing)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ for each position:                                      │   │
│  │  • Parse responsibilities (string→array)               │   │
│  │  • Parse requirements (string→array)                   │   │
│  │  • Parse skills (string→array)                         │   │
│  │  • Keep other fields as-is                             │   │
│  │  • Handle errors gracefully                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│          FILTERING & DISPLAY LOGIC                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Extract unique departments from positions           │   │
│  │ 2. Extract unique locations from positions             │   │
│  │ 3. Populate filter dropdowns                           │   │
│  │ 4. Filter by selected department (if != 'all')         │   │
│  │ 5. Filter by selected location (if != 'all')           │   │
│  │ 6. Display filtered results                            │   │
│  │ 7. Show position count                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              UI DISPLAY (React Components)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Loading State:                                          │   │
│  │  └─ Show "Loading job positions..."                    │   │
│  │                                                         │   │
│  │ Empty State:                                            │   │
│  │  └─ Show "No positions found matching your criteria."   │   │
│  │                                                         │   │
│  │ Positions List:                                         │   │
│  │  ├─ Department Filter Dropdown                         │   │
│  │  │  └─ Options: All, Engineering, Sales, Support...   │   │
│  │  ├─ Location Filter Dropdown                           │   │
│  │  │  └─ Options: All, Bangalore, Mumbai, Delhi...      │   │
│  │  └─ Cards for each position:                           │   │
│  │     ├─ Title (e.g., "Senior Frontend Developer")       │   │
│  │     ├─ Badges: Department, Location, Type, Status     │   │
│  │     ├─ Description                                     │   │
│  │     └─ "View Details" Button                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Sample API Response Format

### Raw JSON from API
```json
[
  {
    "id": 1,
    "title": "Senior Frontend Developer",
    "slug": "senior-frontend-developer",
    "department": "Engineering",
    "location": "Bangalore",
    "type": "Full-time",
    "experienceLevel": "Senior",
    "workExperience": "5+ years",
    "education": "Bachelor's in Computer Science",
    "description": "Join our team as a Senior Frontend Developer...",
    "aboutRole": "We are looking for an experienced Frontend Developer...",
    "responsibilities": "[\"Lead development of UI components\", \"Mentor team members\", \"Code review\"]",
    "requirements": "[\"5+ years React experience\", \"Strong TypeScript skills\", \"REST API knowledge\"]",
    "skills": "[\"React\", \"TypeScript\", \"TailwindCSS\", \"Node.js\"]",
    "isActive": true,
    "createdAt": "2025-11-27T10:00:00.000Z"
  }
]
```

### After Frontend Processing
```javascript
{
  id: 1,
  title: "Senior Frontend Developer",
  slug: "senior-frontend-developer",
  department: "Engineering",
  location: "Bangalore",
  type: "Full-time",
  // ... other fields ...
  responsibilities: [
    "Lead development of UI components",
    "Mentor team members",
    "Code review"
  ],
  requirements: [
    "5+ years React experience",
    "Strong TypeScript skills",
    "REST API knowledge"
  ],
  skills: [
    "React",
    "TypeScript",
    "TailwindCSS",
    "Node.js"
  ]
}
```

## 🎯 Frontend Query Implementation

```javascript
const { data: openPositions = [], isLoading } = useQuery({
  // Unique identifier for this query
  queryKey: ['job-positions'],
  
  // Function that fetches the data
  queryFn: async () => {
    console.log('🔍 Fetching job positions from API...');
    
    const response = await fetch('/api/job-positions');
    const data = await response.json();
    
    // Parse JSONB fields
    return data.map(position => ({
      ...position,
      responsibilities: typeof position.responsibilities === 'string'
        ? JSON.parse(position.responsibilities)
        : position.responsibilities,
      requirements: typeof position.requirements === 'string'
        ? JSON.parse(position.requirements)
        : position.requirements,
      skills: typeof position.skills === 'string'
        ? JSON.parse(position.skills)
        : position.skills,
    }));
  },
  
  // Cache for 5 minutes
  staleTime: 5 * 60 * 1000,
  
  // Keep data for 10 minutes
  gcTime: 10 * 60 * 1000,
});
```

## 🔍 Filter Logic

```javascript
// Step 1: Extract unique departments & locations
const validPositions = Array.isArray(openPositions) ? openPositions : [];
const departments = ["all", ...new Set(validPositions.map(p => p.department))];
const locations = ["all", ...new Set(validPositions.map(p => p.location))];

// Step 2: Apply filters
let filteredPositions = validPositions;

if (selectedDepartment !== 'all') {
  filteredPositions = filteredPositions.filter(p => p.department === selectedDepartment);
}

if (selectedLocation !== 'all') {
  filteredPositions = filteredPositions.filter(p => p.location === selectedLocation);
}

// Step 3: Display results
console.log(`Found ${filteredPositions.length} positions`);
```

## 📊 Console Logging Output

```
🔍 Fetching job positions from API...
✅ API Response Status: 200
📊 Raw API Data received: [...]
📝 Data type: object
📋 Is Array?: true
📈 Data length: 5

📌 Processing position: Senior Frontend Developer
✓ Parsed responsibilities for Senior Frontend Developer
✓ Parsed requirements for Senior Frontend Developer
✓ Parsed skills for Senior Frontend Developer

📌 Processing position: Product Manager
✓ Parsed responsibilities for Product Manager
✓ Parsed requirements for Product Manager
✓ Parsed skills for Product Manager

✅ Successfully processed 5 positions
🎯 Final formatted data: {...}

📊 Valid positions: 5
🏢 Available departments: ["all", "Engineering", "Product", "Marketing"]
📍 Available locations: ["all", "Bangalore", "Mumbai"]
✅ Total positions after filtering: 5
```

## 🎨 UI Display Logic

### Loading State
```tsx
{isLoading ? (
  <Card>
    <p>Loading job positions...</p>
  </Card>
) : ...}
```

### Empty State
```tsx
{filteredPositions.length === 0 ? (
  <Card>
    <p>No positions found matching your criteria.</p>
    {validPositions.length > 0 && (
      <p>Total positions available: {validPositions.length}</p>
    )}
  </Card>
) : ...}
```

### Position Cards
```tsx
{filteredPositions.map((position) => (
  <Card key={position.id}>
    <h3>{position.title}</h3>
    <Badge>{position.department}</Badge>
    <Badge>{position.location}</Badge>
    <Badge>{position.type}</Badge>
    <p>{position.description}</p>
    <Link href={`/careers/${position.slug}`}>
      <Button>View Details</Button>
    </Link>
  </Card>
))}
```

## 🛠️ Debugging Checklist

- [ ] Check browser console for fetch errors
- [ ] Verify API returns 200 status code
- [ ] Check if data array is not empty
- [ ] Look for JSON parse errors
- [ ] Verify responsibilities/requirements/skills are arrays
- [ ] Check if department/location filters populate
- [ ] Test filter combinations work
- [ ] Verify position cards display correctly
- [ ] Test "View Details" navigation works
- [ ] Check responsive design on mobile

## 📝 Key Points

1. **Only Active Positions Shown:** API filters `isActive = true`
2. **Dynamic Filters:** Departments and locations auto-populate from data
3. **Graceful Parsing:** JSON parse errors don't break the page
4. **Caching:** Data cached for 5 minutes (configurable)
5. **Detailed Logging:** Console shows every step for debugging
6. **Responsive Design:** Works on mobile, tablet, and desktop
7. **Accessibility:** Uses semantic HTML and ARIA attributes

---

**Version:** 1.0  
**Updated:** November 27, 2025  
**Status:** ✅ Complete and Working
