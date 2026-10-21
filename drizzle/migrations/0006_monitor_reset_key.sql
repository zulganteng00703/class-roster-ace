DROP POLICY IF EXISTS "kv read" ON public.app_kv;
CREATE POLICY "kv read" ON public.app_kv FOR SELECT USING (key = ANY (ARRAY['tka_question_bank','tka_exam_classes']) OR (key = 'tka_monitor_reset' AND public.tka_has_role('admin')));
DROP POLICY IF EXISTS "Admin kv insert" ON public.app_kv;
CREATE POLICY "Admin kv insert" ON public.app_kv FOR INSERT WITH CHECK (public.tka_has_role('admin') AND key = ANY (ARRAY['tka_question_bank','tka_exam_classes','tka_monitor_reset']));
DROP POLICY IF EXISTS "Admin kv update" ON public.app_kv;
CREATE POLICY "Admin kv update" ON public.app_kv FOR UPDATE USING (public.tka_has_role('admin') AND key = ANY (ARRAY['tka_question_bank','tka_exam_classes','tka_monitor_reset'])) WITH CHECK (public.tka_has_role('admin') AND key = ANY (ARRAY['tka_question_bank','tka_exam_classes','tka_monitor_reset']));