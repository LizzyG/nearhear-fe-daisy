# Styling Conventions (DaisyUI + Tailwind)

This document defines the styling patterns used throughout the NearHear frontend. All new components should follow these conventions for consistency.

## General Principles

- **Theme tokens only**: Use colors from `tailwind.config.ts` (`primary`, `secondary`, `base-*`, status colors). Avoid hardcoded hex values except for third-party brand colors.
- **Centralized patterns**: Reusable styles are defined in `src/style.css`. Use these classes instead of duplicating styles.
- **Consistent radius/shape**: Avoid custom `border-radius` unless required by design.
- **DaisyUI first**: Use DaisyUI components (badges, alerts, modals, etc.) before building custom solutions.

---

## Typography

Use the centralized typography classes for consistent heading hierarchy:

| Class                 | Usage                        | Example                               |
| --------------------- | ---------------------------- | ------------------------------------- |
| `.heading-page`       | Main page titles             | "Upcoming Events", "Profile"          |
| `.heading-section`    | Major sections within a page | "Your Shows", grouped content headers |
| `.heading-card`       | Card or modal titles         | Filter panel headers, playlist names  |
| `.heading-subsection` | Minor headings, labels       | "Spotify Genres", form section labels |

The `PageHeader` component automatically applies `.heading-page` styling.

---

## Buttons

### Custom Button Classes (defined in `src/style.css`)

| Class                                | Usage                                    |
| ------------------------------------ | ---------------------------------------- |
| `.btn-action-solid`                  | Primary actions (Apply, Submit, Save)    |
| `.btn-action-outline`                | Secondary actions (Clear, Cancel, Close) |
| `.btn-action-outline-error`          | Destructive actions (Disconnect, Delete) |
| `.btn-toggle` / `.btn-toggle-active` | Binary toggle pairs (AND/OR, on/off)     |

All custom buttons support `:disabled` state with reduced opacity.

### DaisyUI Buttons

For filter bar buttons and small actions, use DaisyUI `btn` with modifiers:

```html
<button class="btn btn-sm h-10 border-base-300 bg-base-100 hover:border-primary hover:bg-base-200">
  Venues
</button>
```

For ghost buttons (icon actions):

```html
<button class="btn btn-ghost btn-sm">
  <svg>...</svg>
</button>
```

---

## Form Controls

### Inputs

Use our custom input classes for consistent styling:

| Class               | Usage                                    |
| ------------------- | ---------------------------------------- |
| `.input-primary`    | Standard text inputs                     |
| `.input-primary-sm` | Small text inputs (within cards, inline) |
| `.select-primary`   | Dropdown selects                         |

```html
<input type="text" class="input-primary" placeholder="Search..." />
<select class="select-primary">
  ...
</select>
```

For error states on small inputs:

```html
<input type="text" class="input-primary-sm input-error" />
```

### Checkboxes

Use DaisyUI checkbox with primary styling:

```html
<input type="checkbox" class="checkbox checkbox-primary border-base-300" />
```

### Labels

Use DaisyUI form-control pattern:

```html
<div class="form-control">
  <label class="label">
    <span class="label-text font-medium">Field Name</span>
    <span class="label-text-alt text-base-content/60">optional</span>
  </label>
  <input type="text" class="input-primary" />
</div>
```

---

## Spacing

Follow these conventions for consistent spacing:

| Context                | Class                      |
| ---------------------- | -------------------------- |
| After page header      | `mt-6`                     |
| Between major sections | `mt-8`                     |
| Within cards/sections  | `space-y-4` or `space-y-6` |
| Form field gaps        | `space-y-3`                |
| Button groups          | `gap-3`                    |
| Filter bar content     | `gap-4`                    |

---

## Modals

Use DaisyUI modal pattern with consistent structure:

```html
<div :class="['modal', isOpen && 'modal-open']">
  <div class="modal-box border border-base-300 bg-base-100 shadow-lg">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-base-300 pb-4">
      <h2 class="heading-card">Modal Title</h2>
      <button class="btn btn-ghost btn-square" @click="close">
        <svg><!-- X icon --></svg>
      </button>
    </div>

    <!-- Content -->
    <div class="py-4">...</div>

    <!-- Footer -->
    <div class="flex gap-3 border-t border-base-300 pt-4">
      <button class="btn-action-outline flex-1">Cancel</button>
      <button class="btn-action-solid flex-1">Apply</button>
    </div>
  </div>
  <div class="modal-backdrop" @click="close"></div>
</div>
```

Modal widths:

- Small (date picker, confirmations): `max-w-fit` or `max-w-md`
- Medium (filter panels): `max-w-2xl`
- Large (detail views): `max-w-4xl`

---

## Cards

Use DaisyUI card pattern:

```html
<div class="card border border-base-300 bg-base-100 shadow-sm">
  <div class="card-body p-4">...</div>
</div>
```

For filter/control bars:

```html
<div class="card border border-base-300 bg-base-200 shadow-sm">
  <div class="card-body p-4">...</div>
</div>
```

---

## Lists with Alternating Rows

Use the `.bg-row-alt` class for alternating row backgrounds:

```html
<div class="overflow-hidden rounded-lg border border-base-300">
  <div v-for="(item, index) in items" :class="index % 2 === 0 ? 'bg-base-200' : 'bg-row-alt'">
    ...
  </div>
</div>
```

---

## Badges

Use DaisyUI badges with appropriate variants:

```html
<span class="badge badge-primary badge-sm">Genre</span>
<span class="badge badge-outline badge-sm">Optional</span>
<span class="badge badge-success gap-1">
  <svg><!-- Check icon --></svg>
  Connected
</span>
```

---

## Loading States

Use DaisyUI loading spinner:

```html
<!-- Inline loading -->
<span class="loading loading-spinner loading-sm"></span>

<!-- Block loading with message -->
<div class="flex items-center gap-3">
  <span class="loading loading-spinner loading-md text-primary"></span>
  <span class="text-base-content/70">Loading...</span>
</div>

<!-- Centered loading -->
<div class="flex items-center justify-center py-8">
  <span class="loading loading-spinner loading-lg text-primary"></span>
</div>
```

---

## Alerts

Use DaisyUI alerts for error/success/info states:

```html
<div class="alert alert-error">
  <svg><!-- Error icon --></svg>
  <span>{{ errorMessage }}</span>
</div>

<div class="alert alert-success">
  <svg><!-- Success icon --></svg>
  <div>
    <h3 class="font-bold">Success!</h3>
    <p class="text-sm">Details here...</p>
  </div>
</div>
```

---

## Third-Party Brand Colors

For external services, use the CSS custom properties defined in `style.css`:

| Service   | Text Class        | Background Class |
| --------- | ----------------- | ---------------- |
| Spotify   | `.text-spotify`   | `.bg-spotify`    |
| Bandcamp  | `.text-bandcamp`  | `.bg-bandcamp`   |
| Instagram | `.text-instagram` | `.bg-instagram`  |

Example Spotify button:

```html
<button class="bg-spotify hover:bg-spotify-hover btn gap-2 rounded-full text-white">
  <svg><!-- Spotify icon --></svg>
  Connect with Spotify
</button>
```

---

## Links

Use centralized link classes:

| Class           | Usage                                       |
| --------------- | ------------------------------------------- |
| `.link-primary` | Primary color links with underline on hover |
| `.link-subtle`  | Muted links that brighten on hover          |

For inline text links, the default `<a>` styling applies (primary color, secondary on hover).

---

## Icons

- Use inline SVG icons (not icon fonts)
- Standard sizes: `h-4 w-4` (small), `h-5 w-5` (default), `h-6 w-6` (large)
- Use `stroke="currentColor"` to inherit text color
- Prefer Heroicons style (24x24 viewBox, 1.5 stroke-width)

---

## Responsive Patterns

Standard breakpoint usage:

- Mobile-first: Default styles for mobile
- `md:` - Tablet and up (768px+)
- `lg:` - Desktop (1024px+)

Common patterns:

```html
<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col gap-4 md:flex-row md:items-center">
  <!-- Full width on mobile, auto on desktop -->
  <button class="w-full md:w-auto">
    <!-- Hide on mobile, show on desktop -->
    <span class="hidden md:inline">Full Label</span>
    <span class="md:hidden">Short</span>
  </button>
</div>
```
