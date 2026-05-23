---
name: Lavender Operations
colors:
  surface: '#f6faff'
  surface-dim: '#d2dbe4'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf5fe'
  surface-container: '#e6eff8'
  surface-container-high: '#e0e9f2'
  surface-container-highest: '#dbe4ed'
  on-surface: '#141d23'
  on-surface-variant: '#49454f'
  inverse-surface: '#293138'
  inverse-on-surface: '#e9f2fb'
  outline: '#7a7580'
  outline-variant: '#cac4d0'
  surface-tint: '#655590'
  primary: '#62528d'
  on-primary: '#ffffff'
  primary-container: '#7c6ba8'
  on-primary-container: '#fffbff'
  inverse-primary: '#cfbcff'
  secondary: '#5c5f60'
  on-secondary: '#ffffff'
  secondary-container: '#e1e3e4'
  on-secondary-container: '#626566'
  tertiary: '#676011'
  on-tertiary: '#ffffff'
  tertiary-container: '#b7ad58'
  on-tertiary-container: '#464000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#200f48'
  on-primary-fixed-variant: '#4d3d76'
  secondary-fixed: '#e1e3e4'
  secondary-fixed-dim: '#c5c7c8'
  on-secondary-fixed: '#191c1d'
  on-secondary-fixed-variant: '#454748'
  tertiary-fixed: '#f0e589'
  tertiary-fixed-dim: '#d3c970'
  on-tertiary-fixed: '#1f1c00'
  on-tertiary-fixed-variant: '#4e4800'
  background: '#f6faff'
  on-background: '#141d23'
  surface-variant: '#dbe4ed'
typography:
  display-lg:
    fontFamily: Public Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for high-utility internal operations, specifically tailored for the vehicle rental sector. The brand personality is dependable, calm, and hyper-legible, prioritizing functional clarity over decorative flair. 

The aesthetic follows a **Corporate / Modern** movement, drawing inspiration from contemporary retail banking applications. It emphasizes a "clean-room" environment where data density is balanced with generous negative space to reduce cognitive load for users who manage complex logistics. The visual language evokes a sense of order and institutional trust, ensuring that critical operational statuses (like vehicle availability or payment arrears) are immediately perceivable.

## Colors

The palette is anchored by a warm, sophisticated primary lavender, chosen to provide a professional yet approachable interface that stands out from typical blue-centric enterprise tools.

- **Primary:** Used for key actions, active navigation states, and primary branding elements.
- **Surface & Backgrounds:** A clean white background is utilized for primary workspaces to maximize contrast. Light gray (#F1F5F9) is reserved for subtle section dividers and secondary container backgrounds.
- **Semantic Logic:** 
    - **Success (Green):** Indicates "Available" or "Lunas" (Paid).
    - **Warning (Amber):** Indicates pending actions or upcoming deadlines.
    - **Error (Red):** Indicates "Overdue" or "Hutang" (Debt).
    - **Inactive (Gray):** Indicates archived or non-operational states.

## Typography

This design system utilizes **Public Sans** across all levels. Chosen for its institutional clarity and exceptional readability, it features a generous x-height which is essential for the target 50+ demographic.

To ensure accessibility:
- **Increased Base Size:** The standard body text is set to 16px, with 18px used for primary content reading to ensure comfort.
- **Weight Hierarchy:** Headlines use Semi-Bold (600) and Bold (700) weights to create a clear visual anchor, allowing users to scan operational dashboards quickly.
- **Line Spacing:** Line heights are kept generous (min 1.5x for body text) to prevent "crowding" of information in data-heavy views.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model with strict vertical rhythm based on an 8px unit. 

- **Desktop:** 12-column grid with 24px gutters. Content is typically housed in cards that span 3, 4, 6, or 12 columns.
- **Mobile:** Single column with 16px side margins.
- **Rhythm:** Generous white space is prioritized. Avoid "compact" modes; instead, use 24px or 32px of padding within cards to ensure elements are distinct and touch targets are large (minimum 48px height for all interactive elements).

## Elevation & Depth

Hierarchy is established through **Tonal Layers** supplemented by **Ambient Shadows**.

- **Level 0 (Background):** Solid white or very light gray (#F8F9FA).
- **Level 1 (Cards):** Standard surface for data and list items. Uses a subtle, soft shadow: `0px 4px 12px rgba(0, 0, 0, 0.05)`.
- **Level 2 (Modals/Overlays):** Used for vehicle detail views or payment editors. Uses a more pronounced shadow: `0px 12px 32px rgba(0, 0, 0, 0.1)`.
- **Level 3 (Popovers):** Highest elevation for dropdown menus and tooltips.

Borders are kept minimal, using 1px strokes in light gray (#E2E8F0) to define sections without adding visual noise.

## Shapes

The design system employs a **Rounded** shape language to soften the "industrial" nature of vehicle management and align with the banking-app aesthetic.

- **Standard Elements:** Buttons, input fields, and small UI elements use a 0.5rem (8px) radius.
- **Containers:** Large cards and section blocks use a `rounded-lg` 1rem (16px) radius to create a friendly, modern container feel.
- **Selection Indicators:** Pill-shaped (fully rounded) tags are used for status chips (Available, Overdue) to make them distinct from square action buttons.

## Components

### Buttons
Primary buttons use the Warm Lavender background with white text. Height must be 48px minimum for ease of use. Secondary buttons use a light lavender tint background or a simple gray outline.

### Status Chips
Pill-shaped badges with high-contrast text. For "Overdue" (Red), use a light red background with dark red text to ensure readability while maintaining the semantic color alert.

### Cards
Every vehicle or transaction record is housed in a card. Cards feature a 16px corner radius and a subtle Level 1 shadow. Header areas within cards should be clearly separated by a light gray divider.

### Input Fields
Inputs use a 16px font size to prevent browser zooming on mobile devices. Labels are always persistent (not floating) and positioned above the field for maximum accessibility.

### Lists
Operational lists should use generous row heights (64px+) with clear horizontal dividers. Every list item should have a chevron icon or a clear "Detail" button to signify interactivity.

### Indicators
Use large, colored dots or icons alongside status text to assist users with color-blindness or visual impairment.