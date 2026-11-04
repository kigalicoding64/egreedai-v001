// Shared modern design direction for every AI builder prompt.
export const MODERN_DESIGN_BRIEF = `DESIGN DIRECTION (2026 product standard):
- Think like a senior product designer at a top SaaS company. Pick ONE clear visual direction that fits the business (e.g. bold editorial, calm fintech, vibrant creator, premium dark) and keep it consistent.
- Page story: sticky navbar -> hero with a sharp value promise and two calls to action -> social proof (logos/stats) -> features as a bento-style grid of cards -> how it works (3 steps) -> testimonials -> pricing (highlight the middle plan) -> FAQ -> strong final CTA -> rich footer.
- Use the "styles" object for polish: generous spacing (padding 80-120px for sections), border-radius 16-24px on cards, soft layered shadows, subtle gradients for hero/CTA backgrounds, high-contrast text, clear typographic scale (hero 56-72px, section titles 36-44px, body 16-18px, line-height 1.6).
- Mobile-first and responsive: grids collapse to one column on small screens, tap targets at least 44px.
- Accessible: meaningful alt text, descriptive button labels, sufficient colour contrast.
- Content must be specific and believable for the user's business (real-sounding names, numbers, benefits). No lorem ipsum, no generic "Feature 1".
- HERO (always): props { badge: short eyebrow text e.g. "Direct trade • Single-origin from Kigali", title, subtitle, ctaText, secondaryCtaText, stats: [{ value: "1,800m", label: "Altitude" }, ...3-4 items], bgImage: a real https://images.unsplash.com/photo-...?w=1920&q=80 photo matching the business }.
- NAVBAR: props { brand, links (4-5), ctaText }. Do not give the navbar a background that clashes with the hero; leave navbar styles empty.
- CARDS: props { icon: one emoji, title, description }. Wrap feature cards in a grid with 3 columns.
- Never use the default purple/indigo; let the theme colours show. Keep palettes cohesive with the business.
- Use only safe https links or "#section" anchors. Never use javascript: links.`;
