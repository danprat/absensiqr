# AbsensiQR Web - React PWA Frontend

## Package Identity

Offline-first Progressive Web App untuk guru, admin, dan siswa.  
**Stack:** React 18 + Vite + TailwindCSS  
**PWA:** Service Worker dengan IndexedDB untuk offline sync

## Setup & Run

```bash
# From apps/web directory
npm install

# Development
npm run dev              # Vite dev server (http://localhost:5173)

# Build
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # vitest
npm run test:ui          # vitest --ui
npm run test:e2e         # playwright (if configured)

# Quality
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
```

## Patterns & Conventions

### File Organization
```
src/
├── components/          # Reusable UI components
│   ├── QRScanner/       # QR scanner components
│   ├── OfflineSync/     # Offline sync indicators
│   ├── Forms/           # Form components
│   └── Charts/          # Data visualization
├── pages/               # Route pages (by role)
│   ├── auth/            # Login, Register
│   ├── teacher/         # Scanner, Classes, History
│   ├── admin/           # Dashboard, Students, Settings
│   └── student/         # MyAttendance
├── hooks/               # Custom React hooks
├── services/            # API call functions
├── lib/                 # Utilities (IndexedDB, validation)
└── routes/              # Route definitions
```

### Component Pattern
```tsx
// Functional component with TypeScript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant, children }: ButtonProps) {
  return (
    <button className={cn('btn', `btn-${variant}`)}>
      {children}
    </button>
  );
}
```

### Hook Pattern
```tsx
// Custom hook untuk reusable logic
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // ... implementation
  return { user, login, logout, isAuthenticated };
}
```

### API Calls
```tsx
// Use services layer, not direct fetch in components
import { getStudents } from '@/services/students';

// In component
const { data, isLoading } = useQuery(['students'], getStudents);
```

### Offline Sync
```tsx
// Always check offline status
const { isOnline, pendingSync } = useOfflineSync();

// Queue actions when offline
if (!isOnline) {
  await queueForSync({ action: 'attendance', data });
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Root component + Router |
| `src/hooks/useAuth.ts` | Authentication state |
| `src/hooks/useOfflineSync.ts` | Offline queue & sync |
| `src/lib/db.ts` | IndexedDB (Dexie.js) |
| `src/services/api.ts` | Fetch wrapper |
| `src/sw.ts` | Service Worker |
| `vite.config.ts` | Vite configuration |
| `tailwind.config.js` | TailwindCSS theme |

## JIT Index

```bash
# Find components
rg -n "export (function|const) [A-Z]" src/components

# Find hooks
rg -n "export function use[A-Z]" src/hooks

# Find pages
rg -n "export default function" src/pages

# Find API calls
rg -n "fetch\(|axios\." src/services

# Find IndexedDB usage
rg -n "db\.(add|put|get|delete)" src
```

## Common Gotchas

- Use `@/` alias for imports (configured in vite.config.ts)
- PWA requires HTTPS in production
- IndexedDB is async - always await
- QR Scanner needs camera permissions
- TailwindCSS: use `cn()` utility for conditional classes

## Pre-PR Checks

```bash
cd apps/web && npm run typecheck && npm run lint && npm run test
```
