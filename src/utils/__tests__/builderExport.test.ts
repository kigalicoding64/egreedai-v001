import { describe, expect, it } from 'vitest';
import { exportHTMLCode, exportReactCode } from '../builderExport';
import type { BuilderComponent } from '@/types/builder';

describe('builder exports', () => {
  it('preserves quoted text without turning it into executable HTML', () => {
    const sections: BuilderComponent[] = [{ id: 'title', type: 'heading', props: { text: 'A "quote" <script>alert(1)</script>', level: 'h1' } }];
    const html = exportHTMLCode(sections, 'A <page>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    const code = exportReactCode(sections, '123');
    const data = code.split('const sections: PageSection[] = ')[1]?.split(';\nexport default')[0];
    expect(JSON.parse(data || 'null')).toEqual(sections);
  });

  it('rejects executable link URLs while preserving section anchors', () => {
    const html = exportHTMLCode([
      { id: 'bad', type: 'button', props: { text: 'Bad', href: 'javascript:alert(1)' } },
      { id: 'good', type: 'button', props: { text: 'Good', href: '#pricing' } },
    ], 'Page');
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).toContain('href="#pricing"');
  });
});