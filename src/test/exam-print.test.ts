import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync('public/simulasi.html', 'utf8');
const names = ['selectExamQuestions', 'getClassroomPrintQuestions', 'scopedTeacherExams'];
const helpers = names.map(name => {
  const source = html.match(new RegExp(`function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n    \\}`))?.[0];
  if (!source) throw new Error(`Missing ${name}`);
  return source;
}).join('\n');
const exams = [
  { id: 'own', classroomCode: 'ZUL123', packageId: 'math', questionCount: 2, shuffleQuestions: true },
  { id: 'other-school', classroomCode: 'OTHER1', packageId: 'math', questionCount: 3 },
];
const questions = [
  { id: 'q1', packageId: 'math' }, { id: 'foreign-package', packageId: 'language' },
  { id: 'q2', packageId: 'math' }, { id: 'q3', packageId: 'math' },
];
function select(id: string, classroom: string | null = 'ZUL123') {
  return runInNewContext(`${helpers}\ngetClassroomPrintQuestions(id)`, {
    id, selectedTeacherClass: classroom ? { code: classroom } : null,
    STORAGE_KEYS: { EXAMS: 'exams', QUESTIONS: 'questions' },
    getStoredData: (key: string) => key === 'exams' ? exams : questions,
  });
}
describe('Classroom exam printing', () => {
  it('prints only the configured number from the selected exam package in stable bank order', () => {
    expect(select('own').map((q: { id: string }) => q.id)).toEqual(['q1', 'q2']);
  });
  it('cannot print an exam belonging to another school', () => {
    expect(select('other-school')).toHaveLength(0);
  });
  it('cannot print without a selected classroom', () => {
    expect(select('own', null)).toHaveLength(0);
  });
});