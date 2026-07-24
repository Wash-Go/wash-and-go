# Wash & Go - Frontend

React frontend application built with TanStack Router, Vite, and TailwindCSS.

This is the **public landing / onboarding site** for Wash & Go (Zamboanga City).
It explains the service, the three offerings (Express, Scheduled, Business), and
how pricing works, then hands off to the mobile apps for booking and tracking.
Deployed as a static site on Vercel.

## Folder Structure

```
src/
├── assets/              # Static assets
│   ├── fonts/           # Custom font files (Montserrat, Unbounded)
│   └── images/          # Image files (logos, icons, etc.)
│
├── components/          # React components
│   └── layout/          # Layout components (Header, Footer)
│
├── routes/              # TanStack Router page routes
│   ├── __root.tsx       # Root layout component
│   ├── index.tsx        # Home page (/)
│   ├── login.tsx        # Login page (/login)
│   └── register.tsx     # Register page (/register)
│
└── styles/              # Global styles
    └── globals.css      # Global CSS with Tailwind and font imports

## Future Structure (when needed)
├── components/
│   ├── common/          # Shared/reusable components (Button, Input, Modal, etc.)
│   └── ui/              # UI-specific components (Cards, Badges, etc.)
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and helpers
├── services/            # API calls and external service integrations
├── stores/              # State management (Zustand, Context, etc.)
└── types/               # TypeScript type definitions
```

## Fonts

The project uses custom variable fonts:

- **Montserrat** - Primary sans-serif font for body text
- **Unbounded** - Display font for headings

Usage in Tailwind:

- `font-sans` - Montserrat
- `font-display` - Unbounded

## Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run strict TypeScript checks
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

## Tech Stack

- **React 19** - UI library
- **TanStack Router** - Type-safe routing
- **Vite** - Build tool
- **TailwindCSS v4** - Styling
- **TypeScript** - Type safety

## Runtime

Use Node.js `22.13.0` or newer. Several current TanStack, Vite, and ESLint
dependencies do not support Node `22.11.0`.
