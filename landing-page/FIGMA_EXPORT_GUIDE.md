# Figma Export Guide for Irregular Shapes

## How to Export Your Irregular Shapes from Figma

### Step 1: Prepare Your Shape in Figma

1. **Select your irregular shape** in Figma
2. **Make sure it's ungrouped** if it's part of a group (unless you want the whole group)
3. **Check the shape is a vector** (not an image or raster effect)

### Step 2: Export Settings

1. **Right-click** the shape and select "Export" (or use Export panel)
2. **Choose format:**
   - **SVG** (Recommended) - Scalable, small file size, perfect for shapes
   - **PNG** - Only if you have complex raster effects that can't be SVG
3. **Export settings for SVG:**
   - ✅ Include "id" attribute: **OFF**
   - ✅ Outline text: **ON** (if you have text in the shape)
   - ✅ Simplify stroke: **ON**

### Step 3: File Naming

Use descriptive names:

- `hero-shape-1.svg` - Main hero section shape
- `decorative-flow.svg` - Flowing decorative elements
- `section-divider.svg` - Shape used between sections
- `background-curves.svg` - Subtle background shapes

### Step 4: Optimization After Export

1. **File size check**: SVG files should typically be under 10KB
2. **Clean up**: Remove Figma-specific metadata if needed
3. **Test**: Make sure the shape looks correct when imported

## Integration in Your React Components

### Basic Import and Usage:

```tsx
// Import at the top of your component file
import heroShape from '../assets/images/shapes/hero-shape-1.svg'

// Use in your JSX
;<img
  src={heroShape}
  alt=""
  className="absolute top-0 right-0 w-1/2 h-auto opacity-10 pointer-events-none"
  role="presentation"
/>
```

### Advanced Positioning Examples:

```tsx
{
  /* Background shape - full width, low opacity */
}
;<img
  src={backgroundShape}
  alt=""
  className="absolute inset-0 w-full h-full object-cover opacity-5 pointer-events-none"
  role="presentation"
/>

{
  /* Floating decorative shape */
}
;<img
  src={floatingShape}
  alt=""
  className="absolute top-20 -right-10 w-64 h-auto opacity-20 pointer-events-none transform rotate-12"
  role="presentation"
/>

{
  /* Section divider */
}
;<img
  src={dividerShape}
  alt=""
  className="w-full h-16 object-cover text-gray-100"
  role="presentation"
/>
```

## Performance Best Practices

### Accessibility

- ✅ Use `alt=""` for decorative shapes
- ✅ Add `role="presentation"` for purely decorative elements
- ✅ Use `pointer-events-none` so shapes don't interfere with clicking

### Performance

- ✅ Use `loading="lazy"` for shapes below the fold
- ✅ Keep SVG files under 10KB when possible
- ✅ Use `opacity` instead of semi-transparent colors for better performance

### Responsive Design

```tsx
{
  /* Responsive shape sizing */
}
;<img
  src={heroShape}
  alt=""
  className="absolute top-0 right-0 w-1/3 md:w-1/2 lg:w-2/5 h-auto opacity-10"
  role="presentation"
/>
```

## Common Issues and Solutions

### Issue: Shape looks different than Figma

**Solution**: Check that gradients and effects export properly. Consider PNG if SVG doesn't capture complex effects.

### Issue: SVG file is too large

**Solution**: Simplify the shape in Figma, or use fewer anchor points.

### Issue: Shape doesn't scale properly

**Solution**: Ensure you're using `h-auto` with width classes, or `object-contain`/`object-cover` as needed.

## Your Next Steps

1. **Select the irregular shapes** from your Figma design
2. **Export as SVG** using the settings above
3. **Place files** in `frontend/src/assets/images/shapes/`
4. **Import and use** in your home page component (examples are already in index.tsx)
5. **Test responsiveness** across different screen sizes
