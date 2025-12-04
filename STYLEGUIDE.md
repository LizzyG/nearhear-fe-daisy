## Styling conventions (DaisyUI + Tailwind)

- Prefer DaisyUI components/variants first (`btn`, `card`, `badge`, `modal`, `navbar`, `dock`) before adding custom classes.
- Keep colors to theme tokens from `tailwind.config.ts` (`primary`, `secondary`, `base-*`, status colors). Avoid ad‑hoc hex values.
- Use Tailwind utilities for spacing/typography; only add `@apply` helpers in `src/style.css` for cross‑component patterns that repeat.
- Inputs/selects: use `input input-bordered` or `select select-bordered` with size modifiers (`input-sm`, etc.). Buttons: `btn` with `btn-primary`/`btn-outline`/`btn-ghost` as needed.
- Overlays/panels: use DaisyUI `modal` or `drawer` patterns instead of bespoke fixed overlays. Cards/lists should lean on `card` and `border-base-*` for separation.
- Keep radius/shape consistent via DaisyUI defaults; avoid custom border-radius unless required by design.
- When adding new components, check for reusable layout primitives (container padding, gaps) to keep spacing consistent with existing screens.

