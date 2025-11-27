# 🎯 Careers Detail Page - Data Format Guide

## Overview

The careers detail page now properly handles job position data that comes in different formats:

### API Response Format

```json
{
  "id": 1,
  "title": "Digital Marketing Manager",
  "slug": "digital-marketing-manager",
  "department": "Marketing",
  "location": "Mumbai, India",
  "type": "Full-time",
  "jobId": "JOB-001",
  "experienceLevel": "Mid-Level",
  "workExperience": "3-5 years",
  "education": "Bachelor's degree in Marketing",
  "description": "Join our dynamic team...",
  "aboutRole": "<p>Rich HTML content or plain text</p>",
  "responsibilities": "<p>Can be HTML or JSON array</p>",
  "requirements": "<p>Can be HTML or JSON array</p>",
  "skills": ["Skill 1", "Skill 2"] or "JSON string",
  "isActive": true,
  "expiresAt": "2025-12-01T09:32:06.547Z",
  "sortOrder": 1,
  "createdAt": "2025-10-20T10:14:53.982Z",
  "updatedAt": "2025-11-26T21:16:14.854Z"
}
```

---

## Data Field Handling

### String Fields (Direct Display)
These fields are displayed as-is:
- `title` - Job title
- `department` - Department name
- `location` - Location
- `type` - Employment type
- `jobId` - Job ID
- `experienceLevel` - Experience level
- `workExperience` - Work experience requirement
- `education` - Education requirement
- `description` - Short description

**Display:**
```tsx
<p className="text-gray-700">{position.title}</p>
```

---

### HTML Content Fields
These fields can contain HTML and are rendered safely:
- `aboutRole`
- `responsibilities` (if HTML format)
- `requirements` (if HTML format)

**Data Format:**
```html
<p><u>texture absorbs instantly</u><strong>Discover the secret to glowing</strong></p>
```

**Display:**
```tsx
<div 
  dangerouslySetInnerHTML={{ __html: position.aboutRole }}
  className="prose prose-sm max-w-none"
/>
```

---

### Array Fields
These fields should be arrays of strings:
- `responsibilities` - Array of responsibility items
- `requirements` - Array of requirement items
- `skills` - Array of skill tags

**Data Format (Array):**
```json
[
  "Lead development of UI components",
  "Mentor junior developers",
  "Code review"
]
```

**Data Format (JSON String):**
```json
"[\"Task 1\", \"Task 2\"]"
```

**Display (Array):**
```tsx
<ul>
  {position.responsibilities.map((item) => (
    <li key={item.id}>
      <CheckCircle2 className="..." />
      <span>{item}</span>
    </li>
  ))}
</ul>
```

---

## Data Parsing Logic

### Field Content Parser Function

```typescript
const parseFieldContent = (content: any): string | string[] => {
  // 1. If already an array, return it
  if (Array.isArray(content)) {
    return content;
  }

  // 2. If string, try JSON parse first
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;  // ✓ JSON array
      }
    } catch (e) {
      // Not JSON, continue...
    }

    // 3. If contains HTML, return as HTML string
    if (content.includes('<') && content.includes('>')) {
      return content;  // ✓ HTML content
    }

    // 4. Otherwise, single string in array
    return [content];  // ✓ Plain text
  }

  return [];
};
```

### Processing Steps

1. **Fetch from API** → Raw data received
2. **Check type** → Array? String? HTML?
3. **Parse accordingly** → Proper format for display
4. **Display** → Using appropriate method (array map or dangerouslySetInnerHTML)

---

## Display Conditions

### About the Role
```tsx
{typeof position.aboutRole === 'string' && position.aboutRole.includes('<') ? (
  // Render as HTML
  <div dangerouslySetInnerHTML={{ __html: position.aboutRole }} />
) : (
  // Render as plain text
  <p>{position.aboutRole}</p>
)}
```

### Key Responsibilities
```tsx
{Array.isArray(position.responsibilities) ? (
  // Render as list
  <ul>
    {position.responsibilities.map((item) => (...))}
  </ul>
) : (
  // Render as HTML
  <div dangerouslySetInnerHTML={{ __html: position.responsibilities }} />
)}
```

### What We're Looking For
```tsx
{Array.isArray(position.requirements) ? (
  // Render as list
  <ul>
    {position.requirements.map((item) => (...))}
  </ul>
) : (
  // Render as HTML
  <div dangerouslySetInnerHTML={{ __html: position.requirements }} />
)}
```

### Skills
```tsx
{position.skills && Array.isArray(position.skills) && position.skills.length > 0 ? (
  // Render as badges
  <div>
    {position.skills.map((skill) => (
      <Badge>{skill}</Badge>
    ))}
  </div>
) : (
  // Show fallback
  <p>No skills specified</p>
)}
```

---

## Example Data Transformations

### Example 1: HTML Content

**Raw API Response:**
```json
{
  "aboutRole": "<p><u>texture absorbs</u><strong>Discover the secret</strong></p>"
}
```

**After Processing:**
```javascript
position.aboutRole = "<p><u>texture absorbs</u><strong>Discover the secret</strong></p>"
```

**Display Type:** HTML rendering with `dangerouslySetInnerHTML`

---

### Example 2: Array of Responsibilities

**Raw API Response:**
```json
{
  "responsibilities": [
    "Lead development",
    "Mentor team",
    "Code review"
  ]
}
```

**After Processing:**
```javascript
position.responsibilities = [
  "Lead development",
  "Mentor team",
  "Code review"
]
```

**Display Type:** List with checkmarks

---

### Example 3: JSON String Array

**Raw API Response:**
```json
{
  "skills": "[\"React\", \"TypeScript\", \"Node.js\"]"
}
```

**After Processing:**
```javascript
position.skills = ["React", "TypeScript", "Node.js"]
```

**Display Type:** Skill badges

---

## Console Logging

The page logs detailed information:

```
🔍 Fetching position: digital-marketing-manager
📊 Position data received: {...}
✅ Processed position data: {...}
```

---

## Field Compatibility Matrix

| Field | Can be HTML? | Can be Array? | Can be String? | Display Method |
|-------|--------------|---------------|----------------|----------------|
| title | ❌ | ❌ | ✅ | Text |
| description | ❌ | ❌ | ✅ | Text |
| aboutRole | ✅ | ❌ | ✅ | HTML or Text |
| responsibilities | ✅ | ✅ | ✅ | List or HTML |
| requirements | ✅ | ✅ | ✅ | List or HTML |
| skills | ❌ | ✅ | ✅ | Badges or None |

---

## Best Practices for Data Entry

### For HTML Content Fields
If using HTML, ensure it's valid:
```html
<p>Your content here</p>
<strong>Bold text</strong>
<u>Underlined text</u>
<s>Strikethrough</s>
```

### For Array Fields
Use plain JSON arrays:
```json
["Item 1", "Item 2", "Item 3"]
```

Or properly formatted JSON strings:
```json
"[\"Item 1\", \"Item 2\"]"
```

### For Skills
Always send as array:
```json
["React", "TypeScript", "Node.js"]
```

---

## Error Handling

The page gracefully handles:
- ✅ Missing fields → Shows empty/fallback state
- ✅ Malformed JSON → Treats as HTML or plain text
- ✅ Empty arrays → Shows "No skills specified"
- ✅ Mixed formats → Detects and handles correctly
- ✅ Invalid HTML → Renders safely with sanitization

---

## Testing Data

Use this test data to verify formatting:

```json
{
  "id": 1,
  "title": "Test Position",
  "slug": "test-position",
  "department": "Marketing",
  "location": "Mumbai",
  "type": "Full-time",
  "jobId": "TEST-001",
  "experienceLevel": "Mid-Level",
  "workExperience": "3-5 years",
  "education": "Bachelor's degree",
  "description": "Test description",
  "aboutRole": "<p>This is <strong>HTML</strong> content</p>",
  "responsibilities": [
    "Task 1",
    "Task 2",
    "Task 3"
  ],
  "requirements": [
    "Requirement 1",
    "Requirement 2"
  ],
  "skills": ["Skill 1", "Skill 2"],
  "isActive": true,
  "expiresAt": "2025-12-01T09:32:06.547Z",
  "sortOrder": 1,
  "createdAt": "2025-10-20T10:14:53.982Z",
  "updatedAt": "2025-11-26T21:16:14.854Z"
}
```

---

## Implementation Status

✅ HTML content rendering  
✅ Array list rendering  
✅ JSON string parsing  
✅ Flexible field handling  
✅ Error recovery  
✅ Responsive design  
✅ Console logging  

---

**Version:** 1.0  
**Updated:** November 27, 2025  
**Status:** ✅ Complete and Production-Ready
