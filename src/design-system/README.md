# Pocket design system

The single source of truth for look and feel. Change a value in `tokens.css` and it changes everywhere.

## Files
- `tokens.css`: every color, font, size, radius. Light and dark values live side by side.
- `components.css`: buttons, inputs, cards, chips.
- `patterns.css`: multi-part patterns (wizard action row, repeatable rows, month picker, icon stroke).
- `motion.css`: animation.
- `docs.js` / `design-system.html`: the live reference page.

## Naming
`--ds-<role>`, named by what it is for, never by its color.
- Surfaces: `surface`, `surface-raised`, `page`, `soft`, `hover`
- Lines: `border`, `border-strong`, `control-border`
- Text: `text`, `text-muted`, `text-subtle`, `on-brand`
- Status: `success`, `warning`, `danger`, plus chip pairs `ok / warn / bad` and `*-soft`
- Brand: `brand`, `brand-hover`, `brand-soft`
- Data: `fuel-*` for fuel kinds
- Type: `font-display` (Sora, headings), `font-ui` (Manrope), `fs-*` sizes
- Icons: `icon-stroke`

## Rules
1. Never write a hex color in a page's CSS. Use a token. If none fits, add one to `tokens.css` (light and dark) and show it in `docs.js`.
2. Dark mode is handled by the token. Do not write a separate dark rule for a color a token already covers.
3. Text on a brand or danger fill uses `--ds-on-brand`.
4. Fonts only through `--ds-font-display` and `--ds-font-ui`.
5. Add a new reusable pattern to `patterns.css` and to the Patterns section of `docs.js`.

## Rule for new popups and forms

Every new popup or form is built from the shared pieces, never from one-off classes:

- `ModalShell` for the frame, title, subtitle and close button.
- `Field` inside a `form-grid` for every input and select (use `wide` for a full-width field).
- `cc-options` and `cc-option` for a choice between cards.
- `modal-actions` with `btn btn-secondary` and `btn btn-primary` for the buttons.
- `small-muted` for helper text and `cc-error` for an error line.

The goal popups (add money, spend, finish) and the "Add by typing" card follow this rule.
