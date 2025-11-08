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
  styles/          # Tailwind entrypoint + DaisyUI theme definitions
  views/           # Placeholder feature pages wired into the router
  test/            # Vitest setup hooks
```

- Routing is defined in `src/router/routes.ts` and consumed by the layout header.
- Placeholder views live under `src/views` and use DaisyUI cards to indicate upcoming work.
- Tailwind + DaisyUI are configured in `tailwind.config.ts`, extending our shared palette.

## Theming

Custom themes live in `src/styles/themes.css`. Paste snippets directly from the DaisyUI Theme Builder – the file already contains our default `nearhear` theme and instructions for adding more.

To switch themes at runtime, set the `data-theme` attribute on `html` or any root element (for example, `<html data-theme="cupcake">`). All components rely on DaisyUI tokens (`bg-base-100`, `text-primary`, etc.), so swapping the theme updates the entire interface without extra overrides.

## Conventions

- Components use `<script setup>` with TypeScript.
- Styling depends on Tailwind utility classes and DaisyUI components.
- Keep page-level layout consistent by using the shared `PageHeader` component.
- Run `npm run lint` and `npm run test` before committing to ensure code quality.
