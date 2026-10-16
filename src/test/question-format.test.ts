import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync('public/simulasi.html', 'utf8');
const normalizer = html.match(/function normalizeQuestionFormat\(question\) \{[\s\S]*?\n    \}/)?.[0];
function normalize(question: object) {
  if (!normalizer) throw new Error('Question normalizer missing');
  return runInNewContext(`${normalizer}\nnormalizeQuestionFormat(question)`, { question });
}

describe('Question option rules', () => {
  it('limits MCMA to three options and excludes hidden keys from scoring', () => {
    const q = normalize({ type: 'MCMA', options: ['A', 'B', 'C', 'D'].map(key => ({ key, text: key })), correctKeys: ['A', 'C', 'D'] });
    expect(q.options.map((o: { key: string }) => o.key)).toEqual(['A', 'B', 'C']);
    expect(q.correctKeys).toEqual(['A', 'C']);
  });
  it('keeps exactly three category statements, including empty options', () => {
    const q = normalize({ type: 'BS', statements: [{ text: '', correct: false }] });
    expect(q.statements).toHaveLength(3);
    expect(q.statements[0]).toEqual({ text: '', correct: false });
  });
  it('preserves four options and the answer key for ordinary multiple choice', () => {
    const original = { type: 'PG', options: ['A', 'B', 'C', 'D'].map(key => ({ key })), correctKey: 'D' };
    expect(normalize(original)).toEqual(original);
  });
});