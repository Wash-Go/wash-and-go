# Wash & Go - Frontend

React frontend application built with TanStack Router, Vite, and TailwindCSS.

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
