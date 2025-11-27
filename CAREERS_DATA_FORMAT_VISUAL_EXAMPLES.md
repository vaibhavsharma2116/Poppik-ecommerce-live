# 📊 API Data Format - Visual Examples

## 1️⃣ Complete Job Position Object

```json
{
  ✓ "id": 1,
  ✓ "title": "Senior Frontend Developer",
  ✓ "slug": "senior-frontend-developer",
  ✓ "department": "Engineering",
  ✓ "location": "Bangalore",
  ✓ "type": "Full-time",
  ✓ "jobId": "ENG-2025-001",
  ✓ "experienceLevel": "Senior",
  ✓ "workExperience": "5+ years",
  ✓ "education": "Bachelor's in Computer Science or equivalent",
  ✓ "description": "We are looking for an experienced Senior Frontend Developer to lead our UI/UX initiatives and mentor junior developers.",
  ✓ "aboutRole": "In this role, you will design and implement high-quality React components, lead frontend architecture decisions, and help shape our product's user experience.",
  ✓ "responsibilities": [
      "Lead development of reusable React components",
      "Mentor junior developers and conduct code reviews",
      "Optimize application performance and SEO",
      "Collaborate with product and design teams",
      "Participate in architectural discussions"
    ],
  ✓ "requirements": [
      "5+ years of professional frontend development experience",
      "Expert-level knowledge of React.js and TypeScript",
      "Strong understanding of REST APIs and GraphQL",
      "Experience with modern CSS frameworks (TailwindCSS, CSS-in-JS)",
      "Git proficiency and experience with CI/CD"
    ],
  ✓ "skills": [
      "React.js",
      "TypeScript",
      "TailwindCSS",
      "Node.js",
      "Git",
      "REST APIs",
      "Performance Optimization"
    ],
  ✓ "isActive": true,
  ✓ "expiresAt": null,
  ✓ "sortOrder": 1,
  ✓ "createdAt": "2025-11-27T10:30:00.000Z",
  ✓ "updatedAt": "2025-11-27T10:30:00.000Z"
}
```

---

## 2️⃣ API Response Array

```json
GET /api/job-positions
Status: 200 OK

[
  {
    "id": 1,
    "title": "Senior Frontend Developer",
    "slug": "senior-frontend-developer",
    "department": "Engineering",
    "location": "Bangalore",
    "type": "Full-time",
    ...
  },
  {
    "id": 2,
    "title": "Product Manager",
    "slug": "product-manager",
    "department": "Product",
    "location": "Mumbai",
    "type": "Full-time",
    ...
  },
  {
    "id": 3,
    "title": "UX Designer",
    "slug": "ux-designer",
    "department": "Design",
    "location": "Bangalore",
    "type": "Full-time",
    ...
  }
]
```

---

## 3️⃣ Field Types & Examples

### String Fields
```
title: "Senior Frontend Developer"
slug: "senior-frontend-developer"
department: "Engineering"
location: "Bangalore"
type: "Full-time"
jobId: "ENG-2025-001"
experienceLevel: "Senior"
workExperience: "5+ years"
education: "Bachelor's in Computer Science"
description: "Join our team..."
aboutRole: "In this role, you will..."
```

### Array Fields
```
responsibilities: [
  "Lead frontend development",
  "Mentor junior developers",
  "Code review"
]

requirements: [
  "5+ years experience",
  "React expertise",
  "TypeScript proficiency"
]

skills: [
  "React.js",
  "TypeScript",
  "TailwindCSS"
]
```

### Boolean Fields
```
isActive: true    ← Position is actively hiring
isActive: false   ← Position is closed
```

### Number Fields
```
id: 1              ← Auto-increment
sortOrder: 1       ← Display order (lower = higher priority)
```

### Timestamp Fields
```
createdAt: "2025-11-27T10:30:00.000Z"
updatedAt: "2025-11-27T10:30:00.000Z"
expiresAt: null    ← Optional, null if no expiration
```

---

## 4️⃣ Frontend Processing Example

### Raw API Response (String Arrays)
```json
{
  "id": 1,
  "title": "Senior Developer",
  "responsibilities": "[\"Task 1\", \"Task 2\"]",  ← STRING!
  "requirements": "[\"Req 1\", \"Req 2\"]",        ← STRING!
  "skills": "[\"Skill 1\", \"Skill 2\"]"          ← STRING!
}
```

### After Frontend Processing
```javascript
{
  id: 1,
  title: "Senior Developer",
  responsibilities: ["Task 1", "Task 2"],      // ✓ ARRAY
  requirements: ["Req 1", "Req 2"],            // ✓ ARRAY
  skills: ["Skill 1", "Skill 2"]               // ✓ ARRAY
}
```

---

## 5️⃣ Filter Examples

### Initial State
```javascript
selectedDepartment: "all"
selectedLocation: "all"

Available Departments: ["all", "Engineering", "Product", "Design"]
Available Locations: ["all", "Bangalore", "Mumbai"]
```

### After Selecting Department
```javascript
selectedDepartment: "Engineering"
selectedLocation: "all"

Filtered Positions:
├─ Senior Frontend Developer (Engineering, Bangalore)
├─ Backend Developer (Engineering, Bangalore)
└─ DevOps Engineer (Engineering, Mumbai)
```

### After Selecting Both
```javascript
selectedDepartment: "Engineering"
selectedLocation: "Bangalore"

Filtered Positions:
├─ Senior Frontend Developer
└─ Backend Developer
```

---

## 6️⃣ UI Display Format

### Filter Dropdowns
```
┌─────────────────────────────────┐
│ Department                      │
│ [All Departments           ▼]   │
│ All Departments                 │
│ Design                          │
│ Engineering                     │
│ Product                         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Location                        │
│ [All Locations             ▼]   │
│ All Locations                   │
│ Bangalore                       │
│ Mumbai                          │
│ Delhi                           │
└─────────────────────────────────┘
```

### Position Card
```
┌───────────────────────────────────────────────────────┐
│ Senior Frontend Developer                             │
│ [Engineering] [📍 Bangalore] [Full-time]             │
│                                                       │
│ We are looking for an experienced Senior Frontend    │
│ Developer to lead our UI/UX initiatives and mentor   │
│ junior developers.                                    │
│                                                       │
│                        [View Details →]              │
└───────────────────────────────────────────────────────┘
```

### Position Detail Page
```
Title: Senior Frontend Developer
Type: Full-time | Location: Bangalore | Department: Engineering

About the Role:
In this role, you will design and implement high-quality 
React components, lead frontend architecture decisions...

Responsibilities:
• Lead development of reusable React components
• Mentor junior developers and conduct code reviews
• Optimize application performance and SEO

Requirements:
• 5+ years of professional frontend development experience
• Expert-level knowledge of React.js and TypeScript
• Strong understanding of REST APIs and GraphQL

Skills:
React.js | TypeScript | TailwindCSS | Node.js
```

---

## 7️⃣ Console Logging Output

```
🔍 Fetching job positions from API...
✅ API Response Status: 200
📊 Raw API Data received: [
  { id: 1, title: "Senior Frontend Developer", ... },
  { id: 2, title: "Product Manager", ... },
  { id: 3, title: "UX Designer", ... }
]
📝 Data type: object
📋 Is Array?: true
📈 Data length: 3

📌 Processing position: Senior Frontend Developer
✓ Parsed responsibilities for Senior Frontend Developer
✓ Parsed requirements for Senior Frontend Developer
✓ Parsed skills for Senior Frontend Developer

📌 Processing position: Product Manager
✓ Parsed responsibilities for Product Manager
✓ Parsed requirements for Product Manager
✓ Parsed skills for Product Manager

📌 Processing position: UX Designer
✓ Parsed responsibilities for UX Designer
✓ Parsed requirements for UX Designer
✓ Parsed skills for UX Designer

✅ Successfully processed 3 positions
🎯 Final formatted data: [
  {
    id: 1,
    title: "Senior Frontend Developer",
    responsibilities: ["Lead development...", "Mentor..."],
    requirements: ["5+ years...", "React..."],
    skills: ["React.js", "TypeScript", ...]
  },
  ...
]

📊 Valid positions: 3
🏢 Available departments: ["all", "Engineering", "Product", "Design"]
📍 Available locations: ["all", "Bangalore", "Mumbai"]
🔍 Filtering by department: all
🔍 Filtering by location: all
✅ Total positions after filtering: 3
```

---

## 8️⃣ Error Handling Examples

### Parse Error Recovery
```javascript
// If JSON parsing fails:
try {
  const parsed = JSON.parse(position.responsibilities);
  console.log('✓ Parsed responsibilities');
  return parsed;
} catch (e) {
  console.warn('⚠️ Failed to parse responsibilities:', e);
  return [];  // ← Return empty array as fallback
}
```

### Missing Data Handling
```javascript
// If field is undefined:
responsibilities: typeof position.responsibilities === 'string'
  ? JSON.parse(position.responsibilities)
  : Array.isArray(position.responsibilities)
    ? position.responsibilities
    : [];  // ← Default to empty array

// If field is null:
department: position.department || 'Not specified'
location: position.location || 'Remote'
```

---

## 9️⃣ Comparison: Before vs After

### BEFORE (Raw API Response)
```json
{
  "id": 1,
  "title": "Senior Developer",
  "responsibilities": "[\"Task 1\",\"Task 2\"]",  ← String!
  "requirements": "[\"Req 1\"]",                  ← String!
  "skills": "[\"Skill 1\"]"                       ← String!
}
```

### AFTER (Processed by Frontend)
```javascript
{
  id: 1,
  title: "Senior Developer",
  responsibilities: ["Task 1", "Task 2"],  ← Array!
  requirements: ["Req 1"],                  ← Array!
  skills: ["Skill 1"]                       ← Array!
}
```

---

## 🔟 Database vs API vs Frontend

```
┌──────────────────────────────────────┐
│ DATABASE (PostgreSQL)                 │
│ responsibilities: JSONB → "[...]"     │
│ requirements: JSONB → "[...]"         │
│ skills: JSONB → "[...]"               │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ API RESPONSE (JSON)                   │
│ responsibilities: string → "[...]"    │
│ requirements: string → "[...]"        │
│ skills: string → "[...]"              │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ FRONTEND (JavaScript)                 │
│ responsibilities: array → [...]       │
│ requirements: array → [...]           │
│ skills: array → [...]                 │
└──────────────────────────────────────┘
```

---

## Summary Reference

| Aspect | Value | Notes |
|--------|-------|-------|
| **Endpoint** | `/api/job-positions` | GET request |
| **Response Type** | Array<JobPosition> | Always an array |
| **Status Code** | 200 OK | Success |
| **Cache Time** | 5 minutes | Frontend caching |
| **Total Fields** | 16 | All included |
| **String Fields** | 9 | Need parsing? |
| **Array Fields** | 3 | May be strings |
| **Boolean Fields** | 1 | isActive |
| **Timestamp Fields** | 3 | ISO format |
| **Nullable Fields** | expiresAt, jobId | Most are required |

---

**Version:** 1.0  
**Status:** Ready for Production ✅  
**Last Updated:** November 27, 2025
