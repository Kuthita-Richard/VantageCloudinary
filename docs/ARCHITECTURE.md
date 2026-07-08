# Architecture

Technical documentation for developers maintaining or extending Vantage.

---

## Runtime Boundary — The Most Important Concept

Next.js 16 has two JavaScript runtimes. Understanding which code runs where
prevents the most common class of bugs in this project.

```
┌─────────────────────────────────────────────────────────┐
│  EDGE RUNTIME  (proxy.ts / middleware)                  │
│  • Runs on Vercel's edge network, close to the user     │
│  • Starts in < 1ms — very fast                          │
│  • Cannot use Node.js built-ins (fs, crypto, net, etc.) │
│  • Cannot import googleapis, bcrypt, or similar         │
│  • CAN read JWT cookies and redirect requests           │
│                                                         │
│  Files: proxy.ts, auth.config.ts                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  NODE.JS RUNTIME  (Server Components / Server Actions)  │
│  • Runs on Vercel's serverless functions                 │
│  • Full Node.js API available                           │
│  • Can import googleapis, xlsx, @vercel/blob            │
│  • Slightly slower cold start                           │
│                                                         │
│  Files: lib/auth.ts, lib/sheets.ts, actions/index.ts,  │
│         all app/**/page.tsx and layout.tsx (server)     │
└─────────────────────────────────────────────────────────┘
```

### Why Two Auth Files?

`auth.config.ts` — edge-safe. Imported by `proxy.ts`. Contains only the
`authorized()` callback and provider shape definitions.

`lib/auth.ts` — full config. Imports `googleapis` to look up user roles
from Google Sheets. Used only in Server Components and Server Actions.

**Never import `lib/auth.ts` from `proxy.ts`.** If you do, Next.js will
try to bundle `googleapis` for the Edge Runtime, fail silently, and the
middleware will stop working — causing an infinite redirect loop.

---

## Data Flow

```
┌──────────┐     HTTPS      ┌─────────────────────────┐
│  Browser │ ────────────▶  │   proxy.ts (Edge)       │
└──────────┘                │   checks JWT cookie      │
     ▲                      │   → allow / redirect     │
     │                      └────────────┬────────────┘
     │                                   │ allowed
     │                                   ▼
     │                      ┌─────────────────────────┐
     │                      │  Server Component        │
     │                      │  (page.tsx / layout.tsx) │
     │                      │  calls lib/sheets.ts     │
     │ HTML response         └────────────┬────────────┘
     │◀──────────────────────             │
     │                                   ▼
     │                      ┌─────────────────────────┐
     │                      │  Google Sheets API v4    │
     │                      │  (via googleapis SDK)    │
     │                      └─────────────────────────┘

Form Submit / Excel Upload:
┌──────────┐   POST FormData  ┌─────────────────────────┐
│  Browser │ ──────────────▶  │  Server Action           │
└──────────┘                  │  actions/index.ts        │
     ▲                        │  validates with Zod      │
     │ toast / redirect        │  calls lib/sheets.ts    │
     │◀─────────────────────  └─────────────────────────┘
```

---

## Google Sheets Structure

One spreadsheet, six tabs:

### SalesData
Every sales entry is one row. Computed columns (Variance, AchievementPct,
PerformanceFlag) are written at insert time and never recalculated on read
— this keeps dashboard load times fast.

```
A: ID             VTG-20240115-X7K2
B: Date           2024-01-15
C: Year           2024
D: Month          January
E: Region         North
F: Category       Product A
G: SalesRep       Alice Johnson
H: TargetAmount   50000
I: ActualAmount   51200
J: Status         Active
K: Notes          Strong month
L: Variance       1200
M: AchievementPct 102.4
N: PerformanceFlag Exceeding
O: RecordedBy     Alice Johnson
P: RecordedByEmail alice@company.com
Q: RecordedAt     2024-01-15T10:32:00.000Z
```

### Targets
Optional pre-set targets by period and dimension. Not currently wired to the
UI — reserved for a future "target setting" feature.

### Metadata
Reference lists for dropdowns. Columns: Regions | Categories | SalesReps | Statuses.
Row 1 is the header. Each column is independent — you can have 3 regions and
10 sales reps without any alignment requirement.

### Settings
Key-value store for all organisation configuration. Row format: `Key | Value`.
The `getOrgSettings()` function reads all rows into a map and returns a typed
`OrgSettings` object, falling back to `DEFAULT_SETTINGS` for any missing key.

```
OrgName            | Acme Financial Services
PrimaryColor       | #6366f1
CategoryLabel      | Service
CurrencySymbol     | KSh
...
```

### AuditLog
Append-only log of all write operations. Columns: Timestamp | Action | EntityId | UserEmail | UserName | Details.

### AuthorizedUsers
Email | Role | AddedAt | AddedBy. Checked by `lib/auth.ts` during sign-in
and JWT creation. Admins listed in `ADMIN_EMAILS` env var bypass this sheet.

---

## Authentication Flow

```
1. User visits any protected route
   ↓
2. proxy.ts middleware runs authConfig.authorized()
   - Reads JWT from cookie (no external API calls)
   - If no valid JWT → redirect to /login
   - If valid JWT → check role for route-specific guards
   ↓
3. User visits /login, clicks "Continue with Google"
   ↓
4. NextAuth redirects to Google OAuth
   ↓
5. Google returns with auth code → /api/auth/callback/google
   ↓
6. lib/auth.ts signIn() callback runs (Node.js runtime)
   - Checks if email is in ADMIN_EMAILS env var → allow
   - Otherwise checks AuthorizedUsers sheet → allow/deny
   ↓
7. lib/auth.ts jwt() callback runs
   - Looks up role from ADMIN_EMAILS or AuthorizedUsers sheet
   - Embeds role in JWT token
   ↓
8. JWT cookie set in browser
   ↓
9. All subsequent requests: proxy.ts reads role from JWT
   (no more Google Sheets calls for auth)
```

---

## Server Actions

All mutations go through `src/actions/index.ts`. Every action:

1. Calls `requireAuth(minRole)` — throws if unauthenticated or wrong role
2. Validates input with Zod — throws with field-level errors on failure
3. Calls the relevant `lib/sheets.ts` function
4. Calls `revalidatePath()` to bust Next.js cache on affected routes
5. Returns `{ success: boolean, message: string }`

Never call `lib/sheets.ts` write functions directly from Client Components.
Always go through Server Actions.

---

## Theming System

Organisation brand colours are stored as plain text in the Settings sheet.
The root `app/layout.tsx` reads them server-side on every request and injects
them as CSS custom properties on the `<html>` element:

```tsx
// app/layout.tsx (Server Component)
const settings = await getOrgSettings()

<html style={{
  '--primary':    settings.primaryColor,   // e.g. "#6366f1"
  '--sidebar':    settings.sidebarColor,
  '--accent-clr': settings.accentColor,
}}>
```

Tailwind CSS v4 maps these to utility classes via `@theme inline` in
`globals.css`. All components use `var(--primary)` etc. rather than
hardcoded colour values, so a single Settings change recolours the
entire app on the next page load — no rebuild required.

---

## File Upload Flow (Logos)

```
1. Admin selects image file in Settings → Identity
   ↓
2. Browser: file sent to uploadLogoAction() Server Action
   ↓
3. Server Action: validates file type and size (< 2MB)
   ↓
4. @vercel/blob put() uploads file, returns permanent CDN URL
   ↓
5. Server Action: saves URL to Google Sheets Settings tab
   (key: LogoUrlLight, LogoUrlDark, or FaviconUrl)
   ↓
6. revalidatePath('/', 'layout') busts root layout cache
   ↓
7. Next page load: root layout reads new URL, renders logo
```

---

## Performance Flags

Computed at write time (not read time) by `computePerformanceFlag()` in
`lib/utils.ts`. The result is stored in the `PerformanceFlag` column.

```
achievementPct = (actualAmount / targetAmount) × 100

≥ perfThresholdExceeding (default 100%) → "Exceeding"
≥ perfThresholdOnTrack   (default 90%)  → "On Track"
≥ perfThresholdAtRisk    (default 75%)  → "At Risk"
< perfThresholdAtRisk                   → "Below Target"
```

Thresholds are read from the Settings sheet at write time, so changing
thresholds does not retroactively update existing records. This is intentional
— historical records should reflect the threshold that was in effect when
they were created.

---

## Adding a New Page

1. Create `src/app/(dashboard)/your-page/page.tsx`
2. If it needs data: fetch in the Server Component, pass as props to a Client Component
3. If it needs auth guards: add the path to `authConfig.authorized()` in `auth.config.ts`
4. Add it to the `navItems` array in `components/layout/Sidebar.tsx`

---

## Adding a New Settings Field

1. Add the field to the `OrgSettings` type in `types/index.ts`
2. Add it to `DEFAULT_SETTINGS` in `lib/utils.ts`
3. Add the key mapping in `getOrgSettings()` and `updateOrgSettings()` in `lib/sheets.ts`
4. Add a Zod schema field in the relevant schema in `schemas/index.ts`
5. Add the form field to the relevant settings tab component

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Importing `lib/auth.ts` in `proxy.ts` | Infinite redirect loop | Import `auth.config.ts` instead |
| Having both `app/page.tsx` and `app/(dashboard)/page.tsx` | Redirect loop | Delete `app/page.tsx` |
| Calling a Server Action from a Server Component | Build error | Use direct function calls in Server Components |
| Using `useState` in a Server Component | Build error | Add `'use client'` or extract to client component |
| Hardcoding colours instead of `var(--primary)` | Branding changes don't apply | Use CSS custom properties |
| Forgetting `revalidatePath()` after a write | Stale data after save | Always call `revalidatePath()` in Server Actions |
