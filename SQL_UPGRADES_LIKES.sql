-- ============================================================================
-- UPGRADE: Mejorado trigger de like_count con error handling y logging
-- ============================================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor → Paste & Run
-- Fecha: 2025-04-26
-- ============================================================================

-- Step 1: Reemplazar función trigger con versión mejorada
create or replace function update_like_count()
returns trigger language plpgsql as $$
declare
  v_work_id uuid;
  v_affected_rows integer;
begin
  if TG_OP = 'INSERT' then
    v_work_id := NEW.work_id;
    update works set like_count = like_count + 1 where id = v_work_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    if v_affected_rows = 0 then
      raise warning '[update_like_count:INSERT] No work found with id: %', v_work_id;
    end if;
    
  elsif TG_OP = 'DELETE' then
    v_work_id := OLD.work_id;
    update works set like_count = greatest(like_count - 1, 0) where id = v_work_id;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    if v_affected_rows = 0 then
      raise warning '[update_like_count:DELETE] No work found with id: %', v_work_id;
    end if;
  end if;
  
  return null;
exception when others then
  raise warning '[update_like_count] Error: % - %', SQLSTATE, SQLERRM;
  return null;
end;
$$;

-- Step 2: Recrear trigger
drop trigger if exists likes_count_trigger on likes;
create trigger likes_count_trigger
  after insert or delete on likes
  for each row execute procedure update_like_count();

-- Step 3: Validación - ver que los triggers existen
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'likes';

-- Output esperado: 1 fila con likes_count_trigger / likes / INSERT,DELETE
