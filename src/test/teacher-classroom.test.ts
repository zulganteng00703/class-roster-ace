import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync('public/simulasi.html', 'utf8');
const examsFn = html.match(/function scopedTeacherExams\(\) \{[\s\S]*?\n    \}/)?.[0];
const resultsFn = html.match(/function scopedTeacherResults\(\) \{[\s\S]*?\n    \}/)?.[0];
function scope(code: string | null) {
  if (!examsFn || !resultsFn) throw new Error('Missing classroom filters');
  const exams = [{ id: 'exam-school-a', code: 'AB12', classroomCode: 'MONO123' }, { id: 'exam-school-b', code: 'CD34', classroomCode: 'ZUL123' }];
  const results = [{ id: 'student-a', examId: 'exam-school-a' }, { id: 'student-b', examId: 'exam-school-b', classroomCode: 'ZUL123' }];
  return runInNewContext(`${examsFn}\n${resultsFn}\n({ exams: scopedTeacherExams(), results: scopedTeacherResults() })`, {
    selectedTeacherClass: code ? { code } : null,
    STORAGE_KEYS: { EXAMS: 'exams', RESULTS: 'results' },
    getStoredData: (key: string) => key === 'exams' ? exams : results,
  });
}
describe('Teacher classroom isolation across schools', () => {
  it('MONO123 only includes its own exams and students', () => {
    const selected = scope('MONO123');
    expect(selected.exams.map((e: { id: string }) => e.id)).toEqual(['exam-school-a']);
    expect(selected.results.map((r: { id: string }) => r.id)).toEqual(['student-a']);
  });
  it('switching to ZUL123 excludes the previous school', () => {
    expect(scope('ZUL123').results.map((r: { id: string }) => r.id)).toEqual(['student-b']);
  });
  it('shows no results until a classroom is selected', () => {
    expect(scope(null).results).toHaveLength(0);
    expect(scope(null).exams).toHaveLength(0);
  });
});