CREATE OR REPLACE FUNCTION public.save_classroom_exams(incoming jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE selected_code text; existing jsonb; merged jsonb;
BEGIN
 SELECT classroom_code INTO selected_code FROM public.teacher_classroom_accounts WHERE user_id = auth.uid();
 IF selected_code IS NULL OR NOT public.tka_has_role('guru') THEN RAISE EXCEPTION 'Classroom access required'; END IF;
 IF incoming IS NULL OR jsonb_typeof(incoming) <> 'array' THEN RAISE EXCEPTION 'Invalid exams'; END IF;
 INSERT INTO public.app_kv(key,data) VALUES ('tka_exam_classes','[]') ON CONFLICT DO NOTHING;
 SELECT data INTO existing FROM public.app_kv WHERE key = 'tka_exam_classes' FOR UPDATE;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(incoming) e WHERE coalesce(e->>'classroomCode', e->>'code') IS DISTINCT FROM selected_code OR coalesce(length(e->>'id'),0) = 0) THEN RAISE EXCEPTION 'Wrong classroom'; END IF;
 SELECT coalesce(jsonb_agg(e || jsonb_build_object('code',selected_code,'classroomCode',selected_code)),'[]'::jsonb) INTO incoming FROM jsonb_array_elements(incoming) e;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(incoming) n CROSS JOIN jsonb_array_elements(existing) old WHERE coalesce(old->>'classroomCode', old->>'code') <> selected_code AND (old->>'id' = n->>'id' OR old->>'code' = n->>'code')) THEN RAISE EXCEPTION 'Exam belongs to another classroom'; END IF;
 SELECT coalesce(jsonb_agg(e),'[]'::jsonb) INTO merged FROM jsonb_array_elements(existing) e WHERE coalesce(e->>'classroomCode',e->>'code') <> selected_code;
 merged := merged || incoming;
 IF (SELECT count(*) FROM jsonb_array_elements(merged)) <> (SELECT count(DISTINCT e->>'id') FROM jsonb_array_elements(merged) e) THEN RAISE EXCEPTION 'Duplicate exam id'; END IF;
 UPDATE public.app_kv SET data = merged, updated_at = now() WHERE key = 'tka_exam_classes';
END $function$;