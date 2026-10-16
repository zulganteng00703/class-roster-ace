import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync('public/simulasi.html', 'utf8');
const saveFn = html.match(/async function saveExamSettings\(e\) \{[\s\S]*?\n    \}/)?.[0];
const loginFn = html.match(/async function handleStudentLogin\(e\) \{[\s\S]*?\n    \}/)?.[0];

describe('One classroom token for all exams', () => {
  it('saves two exams under ZUL123 without asking for another code', async () => {
    if (!saveFn) throw new Error('Missing save function');
    let exams: Record<string, unknown>[] = [];
    const values: Record<string, string> = {
      editExamId: '', examFormTitle: 'TKA', examFormSubject: 'Matematika',
      examFormPackage: 'math', examFormQuestionCount: '1', examFormDuration: '30',
      examFormKkm: '75', examFormStartDate: '', examFormEndDate: '',
    };
    const context = {
      selectedTeacherClass: { code: 'ZUL123' },
      document: { getElementById: (id: string) => {
        if (!(id in values) && !['examFormShuffle', 'examFormShowScore', 'examFormShowDiscussion', 'examFormStatusOpen'].includes(id)) throw new Error(`Unexpected input ${id}`);
        return { value: values[id], checked: true };
      } },
      STORAGE_KEYS: { QUESTIONS: 'questions', EXAMS: 'exams' },
      getStoredData: (key: string) => key === 'questions' ? [{ packageId: 'math' }] : exams,
      scopedTeacherExams: () => exams, crypto: { randomUUID: () => String(exams.length + 1) },
      cloudSaveKV: async (_key: string, incoming: Record<string, unknown>[]) => { exams = incoming; return true; },
      cloudCache: {}, closeModal: () => {}, renderGuruExamList: () => {},
      showToast: () => {}, showCustomAlert: () => {},
    };
    await runInNewContext(`${saveFn}\nsaveExamSettings({preventDefault(){}})`, context);
    await runInNewContext(`${saveFn}\nsaveExamSettings({preventDefault(){}})`, context);
    expect(exams).toHaveLength(2);
    expect(exams.map(e => e['code'])).toEqual(['ZUL123', 'ZUL123']);
    expect(exams.map(e => e['classroomCode'])).toEqual(['ZUL123', 'ZUL123']);
    expect(exams.map(e => e['id'])).toEqual(['ex_1', 'ex_2']);
  });

  it('student entry matches only the classroom token and selected subject/package', async () => {
    if (!loginFn) throw new Error('Missing student login function');
    const lookup = loginFn.slice(0, loginFn.indexOf('      if (!matchedExam)'));
    const exams = [
      { id: 'wrong-package', classroomCode: 'ZUL123', code: 'OLD1', subject: 'Matematika', packageId: 'other', status: 'OPEN' },
      { id: 'correct', classroomCode: 'ZUL123', teacherKey: 'bu ani', code: 'OLD2', subject: 'Matematika', packageId: 'math', status: 'OPEN' },
    ];
    const find = (code: string) => runInNewContext(`${lookup}\nreturn matchedExam;\n}\nhandleStudentLogin({preventDefault(){}})`, {
      document: { getElementById: (id: string) => ({ value: ({ sLoginName: 'Siswa', sLoginClass: '6A', sLoginSchool: 'Sekolah', sLoginTeacher: 'bu ani', sLoginSubject: 'Matematika', sLoginPackage: 'math', sLoginCode: code } as Record<string, string>)[id] }) },
      cloudRefresh: async () => {}, getStoredData: () => exams, STORAGE_KEYS: { EXAMS: 'exams' },
    });
    expect((await find('zul123')).id).toBe('correct');
    expect(await find('OLD2')).toBeUndefined();
  });
});