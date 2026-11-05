// Shared by the editing canvas, standalone HTML, and exported Vite projects.
export const BUILDER_PAGE_CSS = `
.builder-page {
  --page-background: 0 0% 100%; --page-foreground: 150 10% 12%;
  --page-muted: 145 14% 96%; --page-muted-foreground: 150 5% 40%;
  --page-primary: 158 68% 27%; --page-primary-foreground: 0 0% 100%;
  --page-border: 150 10% 86%; --page-inverse: 150 12% 12%;
  --page-inverse-foreground: 0 0% 100%; --page-highlight: 42 88% 62%;
  --page-overlay: 150 12% 6%;
  container-type: inline-size; color: hsl(var(--page-foreground)); background: hsl(var(--page-background));
  font-family: 'Segoe UI', system-ui, sans-serif; font-size: 16px; line-height: 1.6; letter-spacing: 0;
  overflow-wrap: anywhere; width: 100%; min-width: 0;
}
.builder-page *, .builder-page *::before, .builder-page *::after { box-sizing: border-box; }
.builder-page h1, .builder-page h2, .builder-page h3, .builder-page p, .builder-page ul, .builder-page blockquote { margin: 0; }
.builder-page h1, .builder-page h2, .builder-page h3 { font-weight: 700; }
.builder-page a { color: inherit; text-decoration: none; }
.builder-page a:focus-visible, .builder-page summary:focus-visible, .builder-page input:focus-visible { outline: 3px solid hsl(var(--page-highlight)); outline-offset: 4px; }
.bp-inner { max-width: 1160px; margin-inline: auto; width: 100%; }
.bp-section { padding: 72px 32px; }
.bp-heading { font-weight: 700; line-height: 1.15; text-wrap: balance; }
.bp-heading-h1 { font-size: 56px; } .bp-heading-h2 { font-size: 36px; } .bp-heading-h3 { font-size: 24px; }
.bp-heading-h4, .bp-heading-h5, .bp-heading-h6 { font-size: 20px; }
.bp-muted { color: hsl(var(--page-muted-foreground)); }
.bp-button { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 46px; padding: 12px 22px; border: 1px solid transparent; border-radius: 6px; font-weight: 650; background: hsl(var(--page-primary)); color: hsl(var(--page-primary-foreground)) !important; transition: opacity .2s; text-align: center; }
.bp-button:hover { opacity: .85; }
.bp-button-outline { background: transparent; color: inherit !important; border-color: currentColor; }
.bp-button-secondary { background: hsl(var(--page-muted)); color: hsl(var(--page-foreground)) !important; }
.bp-nav { border-bottom: 1px solid hsl(var(--page-border)); background: hsl(var(--page-background)); padding: 18px 32px; }
.bp-nav-inner, .bp-footer-top { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.bp-brand { font-size: 22px; font-weight: 750; display: flex; align-items: center; gap: 10px; }
.bp-mark { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0; background: hsl(var(--page-primary)); color: hsl(var(--page-primary-foreground)); border-radius: 4px; font-size: 16px; }
.bp-links { display: flex; gap: 24px; flex-wrap: wrap; font-size: 14px; }
.bp-links a:hover { text-decoration: underline; text-underline-offset: 5px; }
.bp-hero { position: relative; isolation: isolate; min-height: 520px; display: flex; align-items: center; padding: 80px 32px; background: hsl(var(--page-muted)); }
.bp-hero-photo { color: hsl(var(--page-inverse-foreground)); background: hsl(var(--page-inverse)); }
.bp-hero-photo::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, hsl(var(--page-overlay) / .82), hsl(var(--page-overlay) / .3)); }
.bp-hero-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.bp-hero-copy { max-width: 730px; }
.bp-eyebrow { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; }
.bp-hero h1 { font-size: 56px; line-height: 1.08; font-weight: 750; text-wrap: balance; }
.bp-hero p { margin-top: 24px; font-size: 18px; max-width: 580px; }
.bp-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; }
.bp-stats { display: flex; flex-wrap: wrap; gap: 32px; margin-top: 48px; padding-top: 24px; border-top: 1px solid currentColor; }
.bp-stat strong { display: block; font-size: 26px; line-height: 1.3; } .bp-stat span { font-size: 13px; }
.bp-grid { display: grid; grid-template-columns: repeat(var(--bp-columns, 3), minmax(0, 1fr)); gap: var(--bp-gap, 24px); }
.bp-card { height: 100%; border: 1px solid hsl(var(--page-border)); padding: 28px; border-radius: 8px; background: hsl(var(--page-background)); }
.bp-card-icon { font-size: 26px; margin-bottom: 24px; display: block; }
.bp-card h3 { font-size: 20px; line-height: 1.3; margin-bottom: 12px; }
.bp-card p { color: hsl(var(--page-muted-foreground)); font-size: 15px; }
.bp-image, .bp-video { display: block; max-width: 100%; height: auto; border-radius: 8px; }
.bp-testimonial { background: hsl(var(--page-muted)); }
.bp-testimonial blockquote { max-width: 780px; margin-inline: auto; }
.bp-quote { font-size: 28px; line-height: 1.5; margin-bottom: 28px !important; }
.bp-author { font-weight: 700; } .bp-role { font-size: 14px; color: hsl(var(--page-muted-foreground)); }
.bp-pricing { padding: 64px 32px; }
.bp-plan { display: flex; flex-direction: column; border: 1px solid hsl(var(--page-border)); padding: 28px; border-radius: 8px; background: hsl(var(--page-background)); }
.bp-plan-featured { border: 2px solid hsl(var(--page-primary)); }
.bp-plan-label { color: hsl(var(--page-primary)); font-size: 12px; font-weight: 700; min-height: 24px; }
.bp-plan h3 { font-size: 22px; } .bp-price { font-size: 40px; font-weight: 750; margin-top: 20px !important; line-height: 1.2; }
.bp-plan ul { list-style: none; padding: 24px 0; flex: 1; } .bp-plan li { display: flex; gap: 10px; padding-block: 7px; font-size: 14px; }
.bp-check { color: hsl(var(--page-primary)); } .bp-period { font-size: 13px; color: hsl(var(--page-muted-foreground)); margin-top: 6px !important; }
.bp-faq { max-width: 800px; margin-inline: auto; }
.bp-faq details { border-bottom: 1px solid hsl(var(--page-border)); padding-block: 22px; }
.bp-faq summary { cursor: pointer; font-size: 18px; font-weight: 650; } .bp-faq p { margin-top: 14px; color: hsl(var(--page-muted-foreground)); }
.bp-cta { background: hsl(var(--page-inverse)); color: hsl(var(--page-inverse-foreground)); }
.bp-cta .bp-inner { display: flex; align-items: center; justify-content: space-between; gap: 36px; }
.bp-cta h2 { font-size: 36px; line-height: 1.2; max-width: 650px; } .bp-cta p { margin-top: 16px; max-width: 600px; }
.bp-cta .bp-button { background: hsl(var(--page-highlight)); color: hsl(var(--page-inverse)) !important; flex-shrink: 0; }
.bp-footer { border-top: 1px solid hsl(var(--page-border)); padding: 40px 32px 24px; }
.bp-footer-bottom { border-top: 1px solid hsl(var(--page-border)); margin-top: 32px; padding-top: 20px; font-size: 13px; color: hsl(var(--page-muted-foreground)); }
.bp-input label { display: block; font-size: 14px; font-weight: 650; margin-bottom: 8px; }
.bp-input input { width: 100%; min-height: 46px; padding: 10px 14px; border: 1px solid hsl(var(--page-border)); border-radius: 6px; color: inherit; background: hsl(var(--page-background)); font: inherit; }
.bp-form { display: grid; gap: 20px; max-width: 640px; margin: auto; } .bp-divider { border: 0; border-top: 1px solid hsl(var(--page-border)); margin-block: 24px; }
@container (max-width: 700px) {
 .bp-nav { padding: 16px 20px; } .bp-nav .bp-links { display: none; }
 .bp-brand { font-size: 18px; } .bp-nav .bp-button { padding: 10px 14px; font-size: 13px; }
 .bp-hero { padding: 56px 24px; min-height: 440px; } .bp-hero h1, .bp-heading-h1 { font-size: 38px; }
 .bp-hero p { font-size: 16px; } .bp-stats { gap: 24px; margin-top: 32px; } .bp-stat { flex-basis: calc(50% - 12px); }
 .bp-section, .bp-pricing { padding: 44px 24px; } .bp-grid { grid-template-columns: minmax(0, 1fr); }
 .bp-cta .bp-inner, .bp-footer-top { flex-direction: column; align-items: flex-start; }
 .bp-cta h2, .bp-heading-h2 { font-size: 30px; } .bp-quote { font-size: 23px; } .bp-footer { padding: 32px 24px 20px; }
}
@media (prefers-reduced-motion: reduce) { .builder-page * { transition: none !important; scroll-behavior: auto !important; } }
`;