// Expert React + Tailwind CSS + Vite knowledge shared by the coding and builder AIs.
// Browser copy of supabase/functions/_shared/reactStack.ts — keep both in sync.
export const REACT_STACK_EXPERT = `REACT + TAILWIND CSS + VITE EXPERTISE (default front-end stack):
React (18/19, TypeScript):
- Function components and hooks only. One component per file, PascalCase names, props typed with an interface.
- State: keep it local and minimal; derive values instead of duplicating state; lift state only when siblings share it. Use useReducer for multi-step state, context only for app-wide concerns (theme, auth), and a data library (TanStack Query) for server data with loading, error and empty states.
- Effects only for syncing with outside systems; always clean up subscriptions, timers and AbortControllers. Never fetch in a loop or set state during render.
- Stable keys from data ids (never array index for reorderable lists). useMemo/useCallback only for measured expensive work or stable props to memoised children.
- Split pages with React.lazy + Suspense; wrap risky trees in an error boundary. Forms: controlled inputs or react-hook-form + zod validation, labelled fields, disabled submit while pending.
- Routing with react-router: pages in src/pages, reusable UI in src/components, hooks in src/hooks (useX), helpers in src/lib.
Tailwind CSS (v3):
- Mobile-first: base classes for phones, then sm: md: lg: xl: for larger screens. Layout with flex and grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3), gap-* instead of margins between siblings, max-w-* + mx-auto + px-4 containers.
- Theme through design tokens: CSS variables in index.css (--background, --foreground, --primary, --muted, --border, --radius) mapped in tailwind.config theme.extend.colors; use bg-background, text-foreground, bg-primary, never hardcoded hex or text-white in components. Support dark mode with darkMode: "class".
- Polish: rounded-2xl cards, shadow-sm to shadow-lg layers, transition-colors/transition-all duration-200, hover: and focus-visible:ring-2 ring-offset-2 states, disabled:opacity-50, animate-pulse skeletons.
- Keep class lists readable; merge conditional classes with clsx + tailwind-merge (cn helper). Never build class names by string concatenation like "grid-cols-" + n (Tailwind cannot see them); map to full class names.
- Accessible: semantic HTML (header, nav, main, section, footer, button), alt text, aria-labels on icon buttons, 44px tap targets, sufficient contrast.
Vite:
- Project shape: index.html at root loading /src/main.tsx; vite.config.ts with @vitejs/plugin-react (or plugin-react-swc) and resolve.alias { "@": path.resolve(__dirname, "./src") } matching tsconfig paths.
- Env vars must start with VITE_ and are read with import.meta.env.VITE_X; never put secrets in front-end env vars.
- Static assets: import images from src/assets for hashed URLs; files in public/ are served as-is from "/".
- Tailwind setup: tailwind.config.ts content ["./index.html", "./src/**/*.{ts,tsx}"], postcss.config.js with tailwindcss + autoprefixer, @tailwind base/components/utilities in src/index.css.
- Scripts: "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview". Code-split heavy routes with dynamic import().`;
