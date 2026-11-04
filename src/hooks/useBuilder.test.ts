import { describe, it, expect } from 'vitest';
import { normalizeAIComponents } from './useBuilder';

describe('normalizeAIComponents', () => {
  it('unwraps { components: [...] } replies', () => {
    const out = normalizeAIComponents({ components: [{ id: 'a', type: 'hero', props: { title: 'Hi' } }] });
    expect(out.map(c => c.type)).toEqual(['hero']);
  });
  it('drops items without a type and fills missing ids/props', () => {
    const out = normalizeAIComponents([{ type: 'navbar' }, { foo: 1 }]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBeTruthy();
    expect(out[0].props).toEqual({});
  });
  it('returns nothing for non-component replies', () => {
    expect(normalizeAIComponents('nope')).toEqual([]);
  });
});
