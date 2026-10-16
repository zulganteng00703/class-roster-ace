import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import katex from 'katex';

const html = readFileSync('public/simulasi.html', 'utf8');
const helpers = html.slice(html.indexOf('    function escapeHTML(str)'), html.indexOf('    function refreshMathPreviews()'));
function render(value: string) {
  return runInNewContext(`${helpers}\nrenderQuestionText(value)`, { value, window: { katex } });
}

describe('Question math rendering', () => {
  it('parses the requested fraction as numerator 29 and denominator 30', () => {
    const result = render(String.raw`$\frac{29}{30}$`);
    expect(result).toContain('<mfrac><mn>29</mn><mn>30</mn></mfrac>');
  });
  it('keeps ordinary text, newlines, and escapes HTML', () => {
    expect(render('Langkah 1\n<script>alert(1)</script>')).toBe('Langkah 1<br>&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('leaves invalid formulas readable without throwing', () => {
    expect(render(String.raw`$\frac{29}$`)).toBe(String.raw`$\frac{29}$`);
  });
});