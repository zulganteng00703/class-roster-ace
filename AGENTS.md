<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Preserve the complete standalone simulation inside the TanStack index iframe; the parent exposes a same-origin Cloud bridge so credentials and deployment configuration never come from the source project.
- Keep all simulation colors and layout rules in src/styles.css, shared with the iframe through the compiled stylesheet URL, so both theme modes use one design system.
- Teacher/admin sign-in uses shared access codes stored as server secrets and checked only in a server function, which signs into a shared role account; never put access codes in client code.
- Clone databases start without source records or auth identities; imports require explicit user-provided exports to avoid touching the original project.
- Classroom creation picks from a fixed school list (src/lib/schools.ts, seeded in the database); each classroom code is the school name without spaces so the shared code format stays valid.
- Teacher classroom entry issues a session scoped to (school classroom, normalized teacher name); RLS and the atomic save RPC filter exams/results by both, so teachers sharing a school token keep separate reports.
- Exam records use unique IDs for identity and classroom codes for student entry; the atomic save RPC normalizes tokens to the selected classroom so multiple exams can share that token safely.
- Teacher printing clones the student question shell and shares math rendering and package selection; print CSS uses the shared stylesheet and browser PDF printing to preserve appearance without screenshot slicing.
