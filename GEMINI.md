# Project Instructions: Quick BMI Calculator

This file defines the foundational mandates and workflows for this project. Adhere to these instructions for all tasks.

## Core Principles

- **Skill Adherence:** Follow all installed skills before making code changes.
- **Web Design Best Practices:** Prioritize Vercel-inspired clean aesthetics, consistent spacing, and interactive feedback.
- **Tailwind CSS:** Follow Tailwind CSS best practices for utility-first styling. Maintain consistency and avoid excessive nesting.
- **Responsive Design:** Build mobile-first, ensuring full responsiveness across all screen sizes.
- **Accessibility:** Use semantic HTML and ensure the UI is accessible (ARIA roles, keyboard navigation, etc.).
- **Code Quality:** Keep code clean, maintainable, and production-ready. Avoid redundant logic and prioritize readability.

## Design System (Vercel-Inspired)

### Visual Language
- **Aesthetic:** Stark black-and-ink on a near-white canvas. Use a multi-color mesh gradient (cyan/blue/magenta/amber) at hero scale as the primary decoration.
- **Surface Ladder:** 
  - `Canvas`: #ffffff (Cards, Dialogs)
  - `Canvas Soft`: #fafafa (Page background)
  - `Ink/Primary`: #171717 (Primary CTAs, dark bands)
- **Borders & Dividers:** Use `Hairline` (#ebebeb) for 1px borders/dividers.

### Typography (Geist/Inter & Geist Mono)
- **Sans-Serif:** Use for all narrative content. Max weight 600.
- **Monospace:** Use for technical labels, code blocks, and section eyebrows.
- **Headlines:** Sentence-case, period-terminated (e.g., "Calculate your BMI."). Use negative letter-spacing for large sizes.

### Spacing & Shapes
- **Base Unit:** 4px. All spacing should be multiples of 4.
- **Corner Radius:**
  - `UI/Inputs`: 6px (`rounded-md` in Tailwind standard is 6px).
  - `Marketing Cards`: 8px (`rounded-lg` in Tailwind is 8px).
  - `Marketing CTAs`: 100px (Pill shape).
- **Elevation:** Use stacked shadows (multiple small offsets) + 1px inset hairline instead of heavy single drop-shadows.

### Component Guidelines
- **Primary CTA:** Black pill (`#171717`) with white text.
- **Secondary CTA:** White pill (`#ffffff`) with ink text and a hairline border.
- **Cards:** White background, 8px radius, subtle stacked shadow.

## Installed Skills

- **skill-creator:** Guide for creating and updating specialized agent skills.

## Technical Stack

- **Framework:** Astro (detected from workspace)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
