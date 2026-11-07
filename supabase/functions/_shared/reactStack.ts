// Expert React + Tailwind CSS + Vite and Python knowledge shared by coding and builder AIs.
// Keep in sync with src/lib/reactStackExpert.ts (the browser-side builder copy).
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
- Scripts: "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview". Code-split heavy routes with dynamic import().

Python expertise (when the user requests Python files or services):
- Use Python 3.11+ with readable PEP 8 code, type hints, small functions, pathlib for paths, and context managers for resources. Preserve meaningful indentation and return full .py file contents, not snippets or pseudocode.
- For Python-only requests generate a Python project, not a forced React/Node scaffold. For full-stack requests keep React + Tailwind + Vite on the front end and put explicitly requested Python APIs in a separate backend/ directory. A Python service runs locally or on separately provisioned hosting, never inside the browser/Vite preview or the platform's serverless JavaScript functions.
- Generate pyproject.toml (or requirements.txt), all imported local modules, a README with virtual-environment creation, dependency installation, run and test commands, and tests/test_*.py with pytest. Declare third-party runtime and test dependencies; prefer the standard library for simple scripts. Do not add npm/package.json to Python-only projects unless genuinely needed.
- For APIs use FastAPI with Pydantic request/response validation, correct HTTP errors, environment-configured CORS, and uvicorn run commands. Use SQLAlchemy and migrations when a database is requested; parameterize queries, enforce authorization on protected endpoints, and never trust client-supplied user IDs.
- Read credentials only from server-side environment variables; provide .env.example with names and harmless placeholders, never real keys. Do not expose secrets through VITE_ variables, logs, or API responses. Never use eval/exec or shell=True on untrusted input; validate file paths and bound external calls with timeouts.
- Handle errors explicitly, use logging without sensitive data, avoid blocking work in async handlers, and keep browser and Python dependency manifests separate. Use relative paths and runnable entry points such as python -m package or python script.py.
- Tests must check requested behavior, invalid inputs, and relevant access rules with concrete assertions. Review Python syntax, indentation, imports, dependencies, route wiring and test commands; do not claim Python execution passed when only reviewing generated source. Serialize complete file contents with proper JSON escaping while preserving Python indentation and strings.`;
