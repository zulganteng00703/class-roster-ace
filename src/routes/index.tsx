import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import appStyles from "@/styles.css?url";
import { signInWithAccessCode } from "@/lib/access-code.functions";
import { enterClassroom, saveClassroomExams } from "@/lib/classroom.functions";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'BATAMY "Banawa TKA Academy" — Platform Simulasi TKA' },
    { name: "description", content: "Latihan Tes Kemampuan Akademik SD, bank soal Bahasa Indonesia dan Matematika, serta pemantauan hasil siswa." },
    { property: "og:title", content: 'BATAMY "Banawa TKA Academy"' },
    { property: "og:description", content: "Ruang siswa, guru, dan administrator untuk persiapan TKA SD." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

declare global {
  interface Window {
    tkaCloud?: {
      styles: string;
      request: (path: string, init?: RequestInit) => Promise<Response>;
      login: (code: string, role: string) => Promise<void>;
      logout: () => Promise<void>;
      classroom: (input: { action: 'create' | 'join'; code: string; teacherName?: string; schoolName?: string }) => Promise<{ code: string; teacher_name: string; school_name: string; teacher_key: string }>;
      saveExams: (exams: Record<string, unknown>[]) => Promise<void>;
      clearClassroom: () => void;
    };
  }
}

function Index() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let classroomSelected = false;
    let activeRole = '';
    window.tkaCloud = {
      styles: appStyles,
      request: async (path, init) => {
        if (!/^\/(app_kv|exam_results)(\?|$)/.test(path)) throw new Error("Permintaan tidak diizinkan");
        const { data: { session } } = await supabase.auth.getSession();
        if (path.startsWith("/exam_results") && (!init?.method || init.method === "GET") && (!session || (activeRole !== 'admin' && !classroomSelected))) {
          return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
        }
        const headers = new Headers(init?.headers);
        headers.set("apikey", import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']);
        if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
        return fetch(`${import.meta.env['VITE_SUPABASE_URL']}/rest/v1${path}`, { ...init, headers });
      },
      login: async (code, role) => {
        const res = await signInWithAccessCode({ data: { code, role: role === "admin" ? "admin" : "guru" } });
        if (!res.ok) throw new Error("Kode akses salah.");
        await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
        activeRole = role;
        classroomSelected = false;
      },
      classroom: async (input) => {
        const res = await enterClassroom({ data: JSON.parse(JSON.stringify(input)) });
        const { error } = await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
        if (error) throw new Error('Tidak dapat membuka kelas.');
        classroomSelected = true;
        return res.classroom;
      },
      clearClassroom: () => { classroomSelected = false; },
      saveExams: async (exams) => { await saveClassroomExams({ data: JSON.parse(JSON.stringify(exams)) }); },
      logout: async () => { activeRole = ''; classroomSelected = false; await supabase.auth.signOut(); },
    };
    setReady(true);
    return () => { delete window.tkaCloud; };
  }, []);
  return ready ? <iframe src="/simulasi.html" title='BATAMY "Banawa TKA Academy"' className="fixed inset-0 h-full w-full border-0" /> : <div className="flex min-h-screen items-center justify-center text-primary">Memuat BATAMY "Banawa TKA Academy"…</div>;
}
