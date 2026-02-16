

# LIFE HEALTH CRM — Premium Authentication Page

## Overview
A cinematic, healthcare-grade authentication page with asymmetrical split layout, glassmorphism auth panel, and elegant motion design. Frontend-only implementation (no backend wiring yet).

---

## Visual Foundation

- **Full-screen background** using the provided deep blue/teal gradient image
- Subtle **radial glow overlay** and **low-opacity grain texture** via CSS
- Custom **CSS variables** for the healthcare color system (#062B33, #2FD6C4, #19A7B8, etc.)
- **Google Fonts**: Cormorant Garamond for headlines, Plus Jakarta Sans for body text

---

## Layout — Asymmetrical Split

### Left Side (40%)
- Large editorial "LIFE HEALTH" heading with "CRM" subtitle
- Tagline: *"Secure Systems for Modern Care"*
- Supporting text about trusted healthcare professionals
- Staggered fade-in animation on load

### Right Side (60%)
- Floating glassmorphism authentication panel
- Dark translucent surface with backdrop blur, cyan edge glow, soft inner shadow
- Slides in from right on page load

---

## Authentication Panel

### Tab Toggle (Sign In / Create Account)
- Two-tab toggle at top of panel
- Active tab gets animated cyan underline + subtle glow
- Switching triggers smooth slide + fade content transition (300ms)

### Sign In Form
- Email & Password fields with animated cyan focus underlines
- "Forgot Password?" minimal link
- Primary CTA: **"Access Secure Portal"** — teal-to-aqua gradient with hover glow + lift
- "OR" divider line
- **Google Login** button (white, elevated, with Google icon)

### Sign Up Form
- Full Name, Email, Password, Confirm Password fields
- Sequential fade-in animation for inputs
- Primary CTA: **"Create Secure Account"**
- Privacy Policy note below

---

## Motion & Animations

- **Page load**: background glow fade-in → headline stagger reveal → panel slides from right → inputs appear sequentially
- **Focus states**: animated cyan underline sweep + glow border
- **Button hover**: glow bloom + subtle lift with smooth easing
- **Tab switch**: slide + fade transition (cubic-bezier)

---

## Responsive Behavior
- On mobile, stack layout vertically — branding on top, auth panel below
- Panel remains full-width on small screens

---

## Strict Scope
- Authentication page only — no dashboard, no marketing sections, no footer
- Clean, premium, healthcare tone throughout

