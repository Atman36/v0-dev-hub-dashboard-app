# Palette's Journal

## 2026-02-18 - Icon-Only Buttons Are a Common A11y Gap in Card Components
Learning: In component libraries using lucide-react icons, icon-only `<Button>` elements are frequently missing `aria-label`. The pattern is easy to miss because the icon *visually* communicates purpose, but is completely silent to screen readers. In this codebase, the Edit button had an aria-label while 3 sibling buttons in the same component didn't — inconsistency like this suggests it's a recurring oversight, not a deliberate choice.
Action: When reviewing card or list-item components with icon buttons, always audit ALL icon-only buttons for aria-label, not just the most "obvious" ones.
