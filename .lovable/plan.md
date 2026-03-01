

## Add Entrance Animations with Framer Motion

### Overview
Add smooth staggered entrance animations to metric cards and table rows using `framer-motion`. Cards will fade-up with a stagger effect, and table rows will slide in sequentially for a polished dashboard load experience.

### Dependencies
- Install `framer-motion` (not currently in the project)

### Changes

**1. `src/components/MetricCard.tsx`**
- Wrap the Card in a `motion.div` with fade-up + scale animation
- Accept an optional `index` prop to calculate stagger delay (`index * 0.1s`)
- Animation: opacity 0 to 1, translateY 20px to 0, scale 0.97 to 1, duration ~0.4s with easeOut

**2. `src/pages/Index.tsx`**
- Pass `index` prop to each `MetricCard` in the metrics grid for stagger timing

**3. `src/components/CustomerTable.tsx`**
- Wrap each `TableRow` in the body with `motion.tr` (replacing the static `TableRow`)
- Staggered fade-in: each row fades in with a small delay based on its index
- Keep delay small (0.03s per row) so large lists don't feel slow
- Cap the animation to the first ~20 rows to avoid performance issues on large datasets

### Technical Notes
- Uses `framer-motion`'s `motion` components with `initial`, `animate`, and `transition` props
- No `AnimatePresence` needed since these are load-time entrance animations only
- Table rows use `motion.tr` which framer-motion supports natively
- Animations are one-shot on mount, no re-animation on data changes

