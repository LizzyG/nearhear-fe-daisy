# NearHear Frontend

Touring logistics dashboard powered by Vue 3, Vite, Tailwind CSS, and DaisyUI. The current build scaffolds navigation, routing, and theming so we can iterate quickly on product features.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install --ignore-scripts   # use --ignore-scripts if the environment blocks postinstall hooks
npm run dev
```

Additional scripts:

- `npm run build` – type-check with `vue-tsc` and create a production build.
- `npm run preview` – preview the production build locally.
- `npm run lint` / `npm run lint:fix` – run ESLint (auto-fix optional).
- `npm run format` / `npm run format:write` – check or enforce Prettier formatting.
- `npm run test` / `npm run test:watch` – run Vitest once or in watch mode.

## Project Structure

```
src/
  components/
    layout/        # App shell, navigation, footer, reusable layout primitives
  router/          # Route table and helpers
  theme/           # Shared color tokens for Tailwind + Vue components
  views/           # Placeholder feature pages wired into the router
  test/            # Vitest setup hooks
```

- Routing is defined in `src/router/routes.ts` and consumed by the layout header.
- Placeholder views live under `src/views` and use DaisyUI cards to indicate upcoming work.
- Tailwind + DaisyUI are configured in `tailwind.config.cjs`, extending our shared palette.

## Theming

All color tokens live in `src/theme/colors.json`. They are consumed by:

- `tailwind.config.cjs` (Tailwind/DaisyUI theme setup)
- `src/theme/theme.ts` (typed exports for Vue components)

Update the JSON file to adjust the palette in one place. Tailwind classnames (for example, `bg-surface-base100`, `text-brand-primary`) and DaisyUI themes will update automatically.

## Conventions

- Components use `<script setup>` with TypeScript.
- Styling depends on Tailwind utility classes and DaisyUI components.
- Keep page-level layout consistent by using the shared `PageHeader` component.
- Run `npm run lint` and `npm run test` before committing to ensure code quality.
