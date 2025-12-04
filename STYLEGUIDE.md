## Styling conventions (DaisyUI + Tailwind)

### General principles
- Keep colors to theme tokens from `tailwind.config.ts` (`primary`, `secondary`, `base-*`, status colors). Avoid ad‑hoc hex values.
- Use Tailwind utilities for spacing/typography; only add `@apply` helpers in `src/style.css` for cross‑component patterns that repeat.
- Keep radius/shape consistent; avoid custom border-radius unless required by design.

### Buttons (defined in `src/style.css`)
Use our custom button classes for consistent styling across the app:

- **`.btn-action-outline`** - Outline button with primary border, transparent background. Use for secondary actions (Clear, Cancel).
- **`.btn-action-solid`** - Solid primary button. Use for primary actions (Apply, Submit).
- **`.btn-toggle`** / **`.btn-toggle-active`** - Toggle button pair for binary choices (AND/OR, on/off). Use `btn-toggle` for inactive, `btn-toggle-active` for selected state.

For filter bar buttons (Venues, Genres), use DaisyUI `btn btn-sm` with custom colors: `bg-base-100 border-base-300 hover:border-primary hover:bg-base-200`.

### Form controls
- Inputs/selects: use `input input-bordered` or `select select-bordered` with size modifiers (`input-sm`, etc.).
- Checkboxes: use `checkbox checkbox-primary` - custom border styling is applied globally.

### Layout patterns
- Overlays/panels: use DaisyUI `modal` pattern with `modal-box`, `modal-backdrop`.
- Cards/lists: use `card` and `border-base-*` for separation.
- When adding new components, check for reusable layout primitives (container padding, gaps) to keep spacing consistent.

