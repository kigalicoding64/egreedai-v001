// Shared design direction for every AI builder prompt.
export const MODERN_DESIGN_BRIEF = `DESIGN DIRECTION:
- Commit to one distinctive visual direction appropriate to the subject: editorial for portfolios, dense and scannable for professional tools, vivid for creative products.
- Generate only sections the request needs. Use unframed full-width sections and constrained inner content. Do not nest cards inside cards.
- The renderer supplies cohesive semantic colours, responsive typography, mobile grids, and spacing. Keep styles empty unless a specific override is needed. Card radius must not exceed 8px. Do not use negative letter spacing, decorative orbs, or gradient heroes.
- HERO: props { badge?, title, subtitle, ctaText, ctaHref, secondaryCtaText?, secondaryCtaHref?, bgImage?, imageAlt?, stats?: [{value, label}] }. Title names the brand, product, place or literal category. Use a full-bleed, relevant image only from assets the user provides or that already exist in the project. Never invent image URLs or hotlink stock photos. If no image is available, omit bgImage. Never use a split-card hero.
- NAVBAR: props { brand, links: [{label, href}], ctaText?, ctaHref? }. Use hrefs matching real component ids, e.g. #pricing. Leave navbar styles empty.
- CARDS: props { icon?, title, description }; place repeated items in a grid with {columns: 3, gap: "24px"} inside a container.
- PRICING: props { plans: [{name, price, period?, features: string[], featured?: boolean, badge?, ctaText?, href?}] }. Highlight only the explicitly featured plan. Do not assume monthly billing.
- FOOTER: props { brand, links: [{label, href}], copyright }. CTA: props {title, subtitle, buttonText, buttonHref}.
- Never fabricate customer quotes, ratings, clients, statistics, prices, contact details or business claims. Omit unknown details; use supplied facts.
- Use semantic CSS variables for colour overrides; do not insert hardcoded palettes or Tailwind classes into styles. All links must use safe https, mailto, tel or #section addresses.
- Use descriptive labels, meaningful alt text, and short copy that fits small screens. Avoid generic Feature 1 or lorem ipsum.`;
