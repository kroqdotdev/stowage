# Stowage: Asset Management App Design

## Overview

Stowage is a self-hosted asset management application for small teams (1-10 users). It tracks physical assets with custom categorization, hierarchical locations, configurable fields, full service lifecycle management, file attachments, and printable barcode/data matrix labels.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Backend/DB | Convex (realtime, file storage, auth) |
| Auth | Convex Auth (email/password) |
| UI Components | shadcn/ui (Radix + Tailwind) |
| Styling | Tailwind CSS 4, flat design, light + dark mode |
| Theming | next-themes |
| Barcode/Matrix | bwip-js (SVG output) |
| Label printing | CSS @media print (browser-native) |
| File uploads | Convex file storage |
| Package manager | pnpm |

## Data Model

### users

- `email`: string (unique)
- `name`: string
- `role`: "admin" | "user"
- `createdBy`: userId (nullable for first admin)
- `createdAt`: number (timestamp)

Auth handled by Convex Auth (email/password). Password storage managed by the auth library.

### assets

- `name`: string
- `assetTag`: string (unique, auto-generated: "AST-0001" or "{prefix}-0001")
- `status`: "active" | "in_storage" | "under_repair" | "retired" | "disposed"
- `categoryId`: Id<"categories"> (optional)
- `locationId`: Id<"locations"> (optional)
- `notes`: string (optional)
- `customFieldValues`: Record<string, any> (keyed by customFieldDefinition ID)
- `createdBy`: Id<"users">
- `createdAt`: number
- `updatedAt`: number

Indexes: `by_assetTag`, `by_categoryId`, `by_locationId`, `by_status`

### categories

- `name`: string
- `prefix`: string (optional, for asset tag generation e.g. "IT", "FUR")
- `description`: string (optional)
- `color`: string (hex, for UI badges)

### tags

- `name`: string
- `color`: string (hex)

### assetTags (junction)

- `assetId`: Id<"assets">
- `tagId`: Id<"tags">

Indexes: `by_assetId`, `by_tagId`

### locations

- `name`: string
- `parentId`: Id<"locations"> (optional, null = root)
- `description`: string (optional)
- `path`: string (denormalized breadcrumb: "Main Building / FM Dept / Shelf 3")

Index: `by_parentId`

### customFieldDefinitions

- `name`: string
- `fieldType`: "text" | "number" | "date" | "dropdown" | "checkbox" | "url" | "currency"
- `options`: string[] (for dropdown type)
- `required`: boolean
- `sortOrder`: number

### serviceProviders

- `name`: string
- `contactEmail`: string (optional)
- `contactPhone`: string (optional)
- `notes`: string (optional)

### serviceRecords

- `assetId`: Id<"assets">
- `date`: number (timestamp)
- `description`: string
- `cost`: number (optional)
- `providerId`: Id<"serviceProviders"> (optional)
- `performedBy`: Id<"users"> (optional)
- `nextServiceDate`: number (optional, timestamp)
- `recurringIntervalDays`: number (optional)

Indexes: `by_assetId`, `by_nextServiceDate`

### attachments

- `assetId`: Id<"assets">
- `storageId`: Id<"_storage"> (Convex file storage)
- `fileName`: string
- `fileType`: string (MIME type)
- `uploadedBy`: Id<"users">
- `uploadedAt`: number

Index: `by_assetId`

### labelTemplates

- `name`: string
- `width`: number (mm)
- `height`: number (mm)
- `elements`: array of positioned elements (JSON):
  - `type`: "assetName" | "assetTag" | "category" | "location" | "customField" | "barcode" | "dataMatrix" | "staticText"
  - `x`: number (mm from left)
  - `y`: number (mm from top)
  - `width`: number (mm)
  - `height`: number (mm)
  - `fontSize`: number (optional)
  - `fontWeight`: "normal" | "bold" (optional)
  - `textAlign`: "left" | "center" | "right" (optional)
  - `fieldId`: string (for customField type)
  - `text`: string (for staticText type)
- `isDefault`: boolean

## Application Routes

```
/login                  Login page
/setup                  First-run admin account creation
/dashboard              Overview: counts by status, recent activity, upcoming services
/assets                 Asset list with filtering, sorting, search
/assets/new             Create asset form
/assets/[id]            Asset detail (info, services, attachments, custom fields)
/assets/[id]/edit       Edit asset
/locations              Location tree view with CRUD
/categories             Category management
/tags                   Tag management
/fields                 Custom field definitions
/services               Upcoming/overdue service schedule
/labels                 Label template designer + print
/settings               User management (admin), app preferences
```

## Navigation

Sidebar with icon + label for each section. Collapsible on mobile. Top bar contains:

- Global search (searches asset name, tag, notes)
- Dark/light mode toggle
- User menu (profile, logout)

## Key UX Flows

### First-run setup

1. First visit: no users exist, redirect to `/setup`
2. Admin creates account (email, name, password)
3. Redirect to `/dashboard`
4. Subsequent visits: redirect to `/login`

### Adding an asset

1. Navigate to `/assets/new`
2. Select category (auto-fills tag prefix)
3. Asset tag auto-generated (e.g. IT-0003)
4. Pick location from tree dropdown
5. Fill custom fields (rendered dynamically from definitions)
6. Set status (default: Active)
7. Drag-and-drop file uploads
8. Save

### Finding an asset

- Global search bar: searches name, tag, notes
- Asset list page: filter by category, status, location, tags
- Sort by name, tag, date created, status
- Scan barcode/data matrix: opens asset detail directly via URL

### Service management

- Dashboard widget: upcoming and overdue services
- Asset detail page: service history tab, add service record form
- Service record: date, description, cost, provider, next service date
- Recurring services: when a service is logged, system auto-calculates next date based on interval
- `/services` page: calendar/list of all upcoming services across assets

### Label printing

1. From asset detail or asset list (batch select), click "Print Label"
2. Pick template (or use default)
3. Preview rendered label with real asset data
4. Browser print dialog with CSS `@media print` sizing
5. No margins, exact dimensions for thermal paper

## Label System

### Default label sizes

- **35mm x 12mm** (compact, for small items): asset tag + small data matrix
- **57mm x 32mm** (2.25" x 1.25", standard thermal): asset tag + name + location + data matrix
- Custom sizes supported via template editor

### Template designer

- Canvas-style editor, position elements on a label
- Available elements: Asset Name, Asset Tag, Category, Location, Custom Fields, Barcode (Code 128), Data Matrix, Static Text
- Each element: draggable position, configurable font size, bold, alignment
- Save with name, mark one as default

### Barcode generation

- bwip-js renders Code 128 (1D) or Data Matrix (2D) as SVG
- Encoded data: URL to asset page (e.g. `https://stowage.cc/assets/{id}`)
- Data Matrix recommended for small labels (more compact than QR)

## Auth & User Management

### Authentication

- Convex Auth with email/password
- Protected routes via Next.js middleware (redirect to `/login`)
- Session management handled by Convex Auth

### Roles

- **admin**: full access, user management, destructive operations (delete categories, locations, etc.)
- **user**: everything except user management and destructive operations

### User management (admin only)

- Create user accounts: email, name, temporary password
- Users change their own password after first login
- No granular permissions beyond admin/user for now

## Design System

- **Style**: Flat design
- **Theme**: Light and dark mode via next-themes
- **Components**: shadcn/ui (Radix primitives + Tailwind)
- **Typography**: Geist Sans (already configured)
- **Colors**: Zinc-based neutral palette (already in use), with category colors for badges
- **Icons**: Lucide (bundled with shadcn/ui)
