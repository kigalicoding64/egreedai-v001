import { describe, expect, it } from 'vitest';
import { recoverSingleFile } from '../../supabase/functions/build-app/recoverSingleFile';

describe('App Builder single-file recovery', () => {
  it('recovers complete code from a broken JSON wrapper with raw newlines and quotes', () => {
    const response = '{"files":[{"path":"src/App.tsx","language":"tsx","content":"export default function App() {\n  return <main>{"Demo"}</main>;\n}\n"}]}';
    expect(recoverSingleFile(response)).toBe('export default function App() {\n  return <main>{"Demo"}</main>;\n}\n');
  });

  it('accepts a fenced file without treating its markup as JSON', () => {
    expect(recoverSingleFile('```ts\nexport const total: number = 2 + 2;\n```')).toBe('export const total: number = 2 + 2;\n');
  });

  it('accepts raw code for the single requested file', () => {
    expect(recoverSingleFile('export const total = 2 + 2;')).toBe('export const total = 2 + 2;');
  });

  it('rejects an unreadable object instead of inventing file contents', () => {
    expect(recoverSingleFile('{"files":[]}')).toBeNull();
  });
});
