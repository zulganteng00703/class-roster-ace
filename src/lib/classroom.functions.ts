import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const enterClassroom = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    action: z.enum(['create', 'join']), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/),
    teacherName: z.string().trim().max(200).optional(), schoolName: z.string().trim().max(200).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc('tka_has_role', { wanted: 'guru' });
    if (roleError || !allowed) throw new Error('Silakan masuk sebagai guru.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.action === 'create') {
      if (!data.teacherName || !data.schoolName) throw new Error('Nama guru dan sekolah wajib diisi.');
      const { error } = await supabaseAdmin.from('teacher_classrooms').insert({ code: data.code, teacher_name: data.teacherName, school_name: data.schoolName });
      if (error) throw new Error(error.code === '23505' ? 'Kode kelas sudah digunakan. Pilih kode lain.' : 'Kelas belum dapat disimpan.');
    }
    const { data: classroom, error } = await supabaseAdmin.from('teacher_classrooms').select('code,teacher_name,school_name').eq('code', data.code).single();
    if (error || !classroom) throw new Error('Kode kelas tidak ditemukan.');
    const secret = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!secret || !url || !key) throw new Error('Layanan kelas belum tersedia.');
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`classroom:${data.code}:${secret}`));
    const password = 'A' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('') + '!';
    const email = `class-${data.code.toLowerCase()}@akses.simulasitka.id`;
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } } });
    let signIn = await client.auth.signInWithPassword({ email, password });
    if (!signIn.data.user) {
      const created = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error && created.error.code !== 'email_exists') throw new Error('Akses kelas belum dapat disiapkan.');
      signIn = await client.auth.signInWithPassword({ email, password });
    }
    const user = signIn.data.user;
    const session = signIn.data.session;
    if (!user || !session) throw new Error('Tidak dapat masuk ke kelas.');
    const { error: accountError } = await supabaseAdmin.from('teacher_classroom_accounts').upsert({ user_id: user.id, classroom_code: data.code });
    const { data: roles, error: readRoleError } = await supabaseAdmin.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'guru');
    if (accountError || readRoleError) throw new Error('Akses kelas belum siap.');
    if (!roles?.length) {
      const { error: grantError } = await supabaseAdmin.from('user_roles').insert({ user_id: user.id, role: 'guru' });
      if (grantError) throw new Error('Akses kelas belum siap.');
    }
    return { classroom, access_token: session.access_token, refresh_token: session.refresh_token };
  });

export const saveClassroomExams = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.array(z.record(z.unknown())).max(500).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('save_classroom_exams', { incoming: data as import('@/integrations/supabase/types').Json });
    if (error) throw new Error('Ujian gagal disimpan. Pastikan kode ujian belum digunakan kelas lain.');
    return { ok: true };
  });