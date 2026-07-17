# Shapes Assets

This folder contains irregular/decorative shapes exported from Figma design files.

## Recommended Files:

- `hero-shape-1.svg` - Primary decorative shape for hero section
- `hero-shape-2.svg` - Secondary decorative shape
- `decorative-flow.svg` - Flowing shapes for section dividers
- `background-curves.svg` - Subtle background elements

## Export Guidelines from Figma:

1. **Format**: Export as SVG for scalability
2. **Optimization**: Remove unnecessary metadata in Figma export settings
3. **Naming**: Use descriptive names matching their purpose
4. **Size**: Export at reasonable resolution (shapes will scale with CSS)

## Usage Example:

```tsx
import heroShape from '../assets/images/shapes/hero-shape-1.svg'

;<img
  src={heroShape}
  alt=""
  className="absolute top-0 right-0 w-1/2 opacity-10"
  role="presentation"
/>
```
