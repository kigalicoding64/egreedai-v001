import React from 'react';
import { BUILDER_PAGE_CSS } from './builderPageStyles';

export interface PageSection {
  id: string;
  type: string;
  props: Record<string, any>;
  styles?: Record<string, string>;
  children?: PageSection[];
}

const anchor = (label: string) => `#${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
const safeLink = (value: unknown, fallback = '#') => typeof value === 'string' && /^(https?:\/\/|mailto:|tel:|#|\/[^/])/.test(value) ? value : fallback;
const safeMedia = (value: unknown) => typeof value === 'string' && /^(https?:\/\/|\/[^/]|data:image\/)/.test(value) ? value : undefined;

export function BuilderSection({ section, renderChild }: { section: PageSection; renderChild?: (child: PageSection) => React.ReactNode }) {
  const { type, props: p, styles = {}, children = [] } = section;
  const childNodes = children.map(child => renderChild ? renderChild(child) : <BuilderSection key={child.id} section={child} />);
  const links = (p.links || []).map((link: string | { label: string; href: string }, i: number) => {
    const label = typeof link === 'string' ? link : link.label;
    return <a key={i} href={safeLink(typeof link === 'string' ? anchor(link) : link.href)}>{label}</a>;
  });
  const button = (text: string, href?: string, variant = '') => <a className={`bp-button ${variant}`} href={safeLink(href)}>{text}<span aria-hidden="true">↗</span></a>;
  switch (type) {
    case 'heading': {
      const level = /^h[1-6]$/.test(p.level) ? p.level : 'h2';
      return React.createElement(level, { className: `bp-heading bp-heading-${level}`, style: styles, id: section.id }, p.text);
    }
    case 'paragraph': return <p style={styles}>{p.text}</p>;
    case 'button': return <a style={styles} className={`bp-button ${p.variant === 'outline' ? 'bp-button-outline' : p.variant === 'secondary' ? 'bp-button-secondary' : ''}`} href={safeLink(p.href)}>{p.text}</a>;
    case 'image': return <img className="bp-image" src={safeMedia(p.src)} alt={p.alt || ''} style={styles} loading="lazy" />;
    case 'video': return p.src ? <video className="bp-video" src={safeMedia(p.src)} controls style={styles} /> : <div className="bp-card bp-muted" style={styles}>Video</div>;
    case 'divider': return <hr className="bp-divider" style={styles} />;
    case 'spacer': return <div style={{ height: p.height || '40px', ...styles }} />;
    case 'container': return <section id={section.id} className="bp-section" style={styles}><div className="bp-inner" style={{ maxWidth: p.maxWidth || '1160px' }}>{childNodes}</div></section>;
    case 'grid': return <div id={section.id} className="bp-grid" style={{ '--bp-columns': Math.max(1, Math.min(6, Number(p.columns) || 3)), '--bp-gap': p.gap || '24px', ...styles } as React.CSSProperties}>{childNodes}</div>;
    case 'navbar': return <nav className="bp-nav" style={styles}><div className="bp-inner bp-nav-inner"><a className="bp-brand" href="#"><span className="bp-mark" aria-hidden="true">{String(p.brand || '').charAt(0)}</span>{p.brand}</a><div className="bp-links">{links}</div>{p.ctaText && button(p.ctaText, p.ctaHref)}</div></nav>;
    case 'hero': return <section id={section.id} className={`bp-hero ${safeMedia(p.bgImage) ? 'bp-hero-photo' : ''}`} style={styles}>
      {safeMedia(p.bgImage) && <img className="bp-hero-image" src={safeMedia(p.bgImage)} alt={p.imageAlt || ''} fetchPriority="high" />}
      <div className="bp-inner"><div className="bp-hero-copy">{p.badge && <span className="bp-eyebrow">{p.badge}</span>}<h1>{p.title}</h1><p>{p.subtitle}</p><div className="bp-actions">{p.ctaText && button(p.ctaText, p.ctaHref)}{p.secondaryCtaText && button(p.secondaryCtaText, p.secondaryCtaHref, 'bp-button-outline')}</div></div>
      {Array.isArray(p.stats) && p.stats.length > 0 && <div className="bp-stats">{p.stats.map((s: any, i: number) => <div className="bp-stat" key={i}><strong>{s.value}</strong><span>{s.label}</span></div>)}</div>}</div>
    </section>;
    case 'card': return <article className="bp-card" style={styles}>{p.icon && <span className="bp-card-icon" aria-hidden="true">{p.icon}</span>}<h3>{p.title}</h3><p>{p.description}</p></article>;
    case 'testimonial': return <section className="bp-section bp-testimonial" style={styles}><blockquote><p className="bp-quote">“{p.quote}”</p><p className="bp-author">{p.author}</p><p className="bp-role">{p.role}</p></blockquote></section>;
    case 'pricing': {
      const plans = Array.isArray(p.plans) ? p.plans : [];
      return <section id={section.id} className="bp-pricing" style={styles}><div className="bp-inner bp-grid" style={{ '--bp-columns': Math.max(1, plans.length) } as React.CSSProperties}>{plans.map((plan: any, i: number) => <article key={i} className={`bp-plan ${plan.featured ? 'bp-plan-featured' : ''}`}><div className="bp-plan-label">{plan.featured ? plan.badge || 'Popular choice' : ''}</div><h3>{plan.name}</h3><p className="bp-price">{plan.price}</p>{plan.period && <p className="bp-period">{plan.period}</p>}<ul>{(plan.features || []).map((f: string, j: number) => <li key={j}><span className="bp-check" aria-hidden="true">✓</span>{f}</li>)}</ul>{button(plan.ctaText || 'Choose plan', plan.href, plan.featured ? '' : 'bp-button-outline')}</article>)}</div></section>;
    }
    case 'faq': return <section id={section.id} className="bp-section" style={styles}><div className="bp-faq">{(p.items || []).map((item: any, i: number) => <details key={i}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>;
    case 'cta': return <section id={section.id} className="bp-section bp-cta" style={styles}><div className="bp-inner"><div><h2>{p.title}</h2><p>{p.subtitle}</p></div>{p.buttonText && button(p.buttonText, p.buttonHref)}</div></section>;
    case 'footer': return <footer className="bp-footer" style={styles}><div className="bp-inner"><div className="bp-footer-top">{p.brand && <strong className="bp-brand">{p.brand}</strong>}<div className="bp-links">{links}</div></div><div className="bp-footer-bottom">{p.copyright}</div></div></footer>;
    case 'list': return p.ordered ? <ol style={styles}>{(p.items || []).map((item: string, i: number) => <li key={i}>{item}</li>)}</ol> : <ul style={styles}>{(p.items || []).map((item: string, i: number) => <li key={i}>{item}</li>)}</ul>;
    case 'input': return <div className="bp-input" style={styles}><label htmlFor={section.id}>{p.label}</label><input id={section.id} type={p.type || 'text'} placeholder={p.placeholder} /></div>;
    case 'form': return <form className="bp-form" style={styles} onSubmit={event => event.preventDefault()}>{childNodes}</form>;
    default: return null;
  }
}

export function BuilderPage({ sections }: { sections: PageSection[] }) {
  return <div className="builder-page"><style dangerouslySetInnerHTML={{ __html: BUILDER_PAGE_CSS }} />{sections.map(section => <BuilderSection key={section.id} section={section} />)}</div>;
}