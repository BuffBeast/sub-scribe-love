

## Fix Logo Transparent Background

The logo PNG has a transparent background, which causes a visible checkerboard pattern (or mismatched background) in some contexts. Rather than editing the image file itself, the fix is to add a solid background behind the logo image element so the transparency blends cleanly.

### Changes

**1. Desktop header logo** (`src/pages/Index.tsx`, ~line 305-309)
- Add a `bg-white rounded-lg p-1` wrapper or apply directly to the `<img>` tag so the transparent areas show white instead of whatever is behind them.

**2. Mobile header logo** (`src/components/MobileHeader.tsx`, ~line 80-83)
- Same treatment: add `bg-white rounded-lg p-1` to the logo `<img>` to give it a clean white backing.

**3. Auth page logo** (`src/pages/Auth.tsx`)
- The auth page logo already has a decorative glow div behind it. Add `bg-white rounded-2xl p-2` to the `<img>` element to ensure the transparent areas look clean there too.

### Approach
- Use a white background with slight rounding and padding on each logo `<img>` element
- This works regardless of light/dark mode since logos typically expect a white/light backing
- Keeps the existing `drop-shadow-xl` and `object-contain` classes intact
- No image file changes needed -- purely CSS fix

