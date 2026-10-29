-- help_messages is written only by /api/save-help-message with the service key,
-- which validates input and derives user_id from a verified session. The public
-- INSERT policy let anyone bypass that validation through PostgREST.
--
-- Rollback:
--   create policy "Anyone can insert help messages" on public.help_messages
--     for insert to public with check (true);
drop policy if exists "Anyone can insert help messages" on public.help_messages;
