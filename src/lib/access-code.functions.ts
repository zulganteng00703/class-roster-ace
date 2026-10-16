import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(buf);
}
function same(a: Uint8Array, b: Uint8Array) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

// Verifies a shared access code on the server and returns a session for the shared role account.
export const signInWithAccessCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ role: z.enum(["guru", "admin"]), code: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env[data.role === "admin" ? "ADMIN_ACCESS_CODE" : "TEACHER_ACCESS_CODE"];
    if (!expected) throw new Error("Kode akses belum diatur.");
    if (!same(await sha(data.code), await sha(expected))) return { ok: false as const };

    const service = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
    const hex = Array.from(await sha(`tka-shared:${data.role}:${service}`)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const email = `${data.role}@akses.simulasitka.id`;
    const password = `A${hex}!`;

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const pub = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });

    // Fast path: the shared account usually already exists with this password.
    let { data: s } = await pub.auth.signInWithPassword({ email, password });
    if (!s.session) {
      // Slow path (first use or rotated secret): create/repair the account, then sign in.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      let user = list?.users.find((u) => u.email === email);
      if (!user) {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error || !created.user) throw new Error("Gagal menyiapkan akun akses.");
        user = created.user;
      } else {
        await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
      }
      const { data: roles } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", user.id).eq("role", data.role);
      if (!roles?.length) await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: data.role });
      ({ data: s } = await pub.auth.signInWithPassword({ email, password }));
    }
    if (!s.session) throw new Error("Gagal masuk.");
    return { ok: true as const, access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });
