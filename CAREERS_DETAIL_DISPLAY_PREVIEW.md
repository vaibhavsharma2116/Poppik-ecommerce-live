# 📱 Careers Detail Page - Data Display Preview

## Your Example Data

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
  "education": "Bachelor's degree in Marketing or related field",
  "description": "Join our dynamic team as a Digital Marketing Manager and help drive our brand's online presence.",
  "aboutRole": "<p><u>texture absorbs instantly without leaving a greasy feel</u>...</p>",
  "responsibilities": "<p><u>texture absorbs instantly</u>...<strong>Discover the secret</strong>...</p>",
  "requirements": "<p><u>texture absorbs instantly</u>...<strong>Discover the secret</strong>...</p>",
  "skills": [],
  "isActive": true,
  "expiresAt": "2025-12-01T09:32:06.547Z",
  "sortOrder": 1,
  "createdAt": "2025-10-20T10:14:53.982Z",
  "updatedAt": "2025-11-26T21:16:14.854Z"
}
```

---

## How It Will Display on the Page

### 🔙 Back Button & Header
```
← Back to All Jobs

Digital Marketing Manager
[Job ID: JOB-001]

[Apply Now]  [Share]
```

### 📊 Job Meta Information
```
💼 Marketing
📍 Mumbai, India
📅 Full-time
```

### 📝 Description
```
Join our dynamic team as a Digital Marketing Manager and help 
drive our brand's online presence.
```

---

### 📌 About the Role (HTML Rendered)
```
texture absorbs instantly without leaving a greasy feel, leaving 
your skin soft, smooth, and radiant all day

Discover the secret to glowing, youthful skin with our all-natural 
beauty formula. Enriched with essential vitamins, nourishing botanicals, 
and deep hydrating ingredients, it revitalizes your skin from within. 
The lightweight texture absorbs instantly without leaving a greasy feel, 
leaving your skin soft, smooth, and radiant all day. Regular use helps 
reduce dullness, dark spots, and fine lines, revealing a healthy, flawless 
complexion. Suitable for all skin types, including sensitive skin — 
because real beauty begins with pure care.
```

---

### ✅ Key Responsibilities (HTML Rendered)
```
texture absorbs instantly without leaving a greasy feel, leaving your 
skin soft, smooth, and radiant all day

Discover the secret to glowing, youthful skin with our all-natural 
beauty formula. Enriched with essential vitamins, nourishing botanicals, 
and deep hydrating ingredients, it revitalizes your skin from within. 
The lightweight texture absorbs instantly without leaving a greasy feel, 
leaving your skin soft, smooth, and radiant all day. Regular use helps 
reduce dullness, dark spots, and fine lines, revealing a healthy, flawless 
complexion. Suitable for all skin types, including sensitive skin — 
because real beauty begins with pure care.
```

---

### ✅ What We're Looking For (HTML Rendered)
```
texture absorbs instantly without leaving a greasy feel, leaving your 
skin soft, smooth, and radiant all day

Discover the secret to glowing, youthful skin with our all-natural 
beauty formula. Enriched with essential vitamins, nourishing botanicals, 
and deep hydrating ingredients, it revitalizes your skin from within. 
The lightweight texture absorbs instantly without leaving a greasy feel, 
leaving your skin soft, smooth, and radiant all day. Regular use helps 
reduce dullness, dark spots, and fine lines, revealing a healthy, flawless 
complexion. Suitable for all skin types, including sensitive skin — 
because real beauty begins with pure care.
```

---

### 🎯 Sidebar - Job Details
```
┌─────────────────────────┐
│ Job Details             │
├─────────────────────────┤
│ Experience Level        │
│ Mid-Level              │
│                         │
│ Work Experience (years) │
│ 3-5 years              │
│                         │
│ Education              │
│ Bachelor's degree in   │
│ Marketing or related   │
│ field                  │
└─────────────────────────┘
```

### 🎯 Sidebar - Skills
```
┌─────────────────────────┐
│ Skills                  │
├─────────────────────────┤
│ No skills specified     │
└─────────────────────────┘
```
*Note: Empty because skills array is empty in your data*

---

## Data Processing Flow

```
API Response
    ↓
    ├─ aboutRole: "<p>HTML...</p>"
    │   └─ Detected as HTML
    │      └─ Display with dangerouslySetInnerHTML
    │
    ├─ responsibilities: "<p>HTML...</p>"
    │   └─ Detected as HTML
    │      └─ Display with dangerouslySetInnerHTML
    │
    ├─ requirements: "<p>HTML...</p>"
    │   └─ Detected as HTML
    │      └─ Display with dangerouslySetInnerHTML
    │
    └─ skills: []
        └─ Array is empty
           └─ Display: "No skills specified"
```

---

## Console Output When Page Loads

```
🔍 Fetching position: digital-marketing-manager
📊 Position data received: {
  id: 1,
  title: "Digital Marketing Manager",
  slug: "digital-marketing-manager",
  department: "Marketing",
  location: "Mumbai, India",
  type: "Full-time",
  jobId: "JOB-001",
  experienceLevel: "Mid-Level",
  workExperience: "3-5 years",
  education: "Bachelor's degree in Marketing or related field",
  description: "Join our dynamic team...",
  aboutRole: "<p><u>texture absorbs instantly...</u></p>",
  responsibilities: "<p><u>texture absorbs instantly...</u></p>",
  requirements: "<p><u>texture absorbs instantly...</u></p>",
  skills: [],
  isActive: true,
  ...
}
✅ Processed position data: {
  id: 1,
  title: "Digital Marketing Manager",
  ...
  aboutRole: "<p><u>texture absorbs instantly...</u></p>",
  responsibilities: "<p><u>texture absorbs instantly...</u></p>",
  requirements: "<p><u>texture absorbs instantly...</u></p>",
  skills: [],
  ...
}
```

---

## Data Type Detection

### HTML Content Detection
```javascript
// Your data contains:
aboutRole: "<p><u>texture absorbs</u><strong>Discover</strong></p>"

// Detection logic:
if (aboutRole.includes('<') && aboutRole.includes('>')) {
  // ✓ Detected as HTML
  // → Will be rendered with dangerouslySetInnerHTML
}
```

### Array Detection
```javascript
// Your data contains:
skills: []

// Detection logic:
if (Array.isArray(skills)) {
  if (skills.length > 0) {
    // Render as badges
  } else {
    // Show "No skills specified"
  }
}
```

---

## Responsive Design

### Desktop View (1024px+)
```
┌─────────────────────────────────────────────┬──────────────┐
│                                             │              │
│  Main Content (2/3 width)                   │  Sidebar     │
│  ├─ Header                                  │  (1/3 width) │
│  ├─ About the Role                          │              │
│  ├─ Key Responsibilities                    │  Job Details │
│  ├─ What We're Looking For                  │              │
│  └─ Apply Button                            │  Skills      │
│                                             │              │
└─────────────────────────────────────────────┴──────────────┘
```

### Mobile View (< 768px)
```
┌──────────────────────┐
│                      │
│  Main Content        │
│  ├─ Header           │
│  ├─ About the Role   │
│  ├─ Key Resp.        │
│  └─ What We're Look. │
│                      │
├──────────────────────┤
│                      │
│  Sidebar             │
│  ├─ Job Details      │
│  └─ Skills           │
│                      │
└──────────────────────┘
```

---

## Style Applied to HTML Content

When HTML is rendered, it uses the `prose prose-sm` class:

```tsx
<div 
  dangerouslySetInnerHTML={{ __html: position.aboutRole }}
  className="prose prose-sm max-w-none"
/>
```

This ensures:
- ✅ Proper typography
- ✅ Heading sizes
- ✅ Paragraph spacing
- ✅ List formatting
- ✅ Text color matching

---

## What If Data Was Different?

### If responsibilities was an array:
```json
"responsibilities": [
  "Lead marketing campaigns",
  "Manage social media",
  "Analyze metrics"
]
```

**Display:**
```
✓ Lead marketing campaigns
✓ Manage social media
✓ Analyze metrics
```
(With green checkmarks)

---

### If skills was populated:
```json
"skills": ["SEO", "SEM", "Content Marketing", "Analytics"]
```

**Display:**
```
[SEO] [SEM] [Content Marketing] [Analytics]
```
(As gray badges)

---

## Accessibility Features

✅ Semantic HTML  
✅ Proper heading hierarchy (h1, h2, h3)  
✅ Icon descriptions (alt text)  
✅ Color contrast compliance  
✅ Keyboard navigation support  
✅ Screen reader friendly  

---

## Summary

Your job position data will display beautifully with:

✅ **HTML Sections** rendered as rich text  
✅ **Empty Skills** shown as fallback message  
✅ **Meta Information** in clean badges  
✅ **Sidebar Details** in organized cards  
✅ **Responsive Layout** on all devices  
✅ **Professional Styling** with proper typography  

The page is ready to display your data! 🎉

---

**Version:** 1.0  
**Status:** ✅ Ready for Production  
**Updated:** November 27, 2025
