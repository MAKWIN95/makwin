-- Portfolios take less space: when what others see is exactly the whole portfolio
-- (nothing hidden, every picture checked), the server stores a small mark instead of a
-- second copy. Only the reading function changes; rows without the mark read as before.
create or replace function public.get_portfolio(p_username text, p_key text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', f.user_id,
    'visibility', f.visibility,
    'content', case
      when f.user_id = auth.uid() then f.content
      when f.public_content = '{"same": true}'::jsonb then f.content
      else f.public_content
    end,
    'updated_at', f.updated_at,
    'mine', coalesce(f.user_id = auth.uid(), false),
    'share_key', case when f.user_id = auth.uid() then f.share_key end,
    'checked_media', case when f.user_id = auth.uid() then to_jsonb(f.checked_media) end,
    'held_media', case when f.user_id = auth.uid() then to_jsonb(f.held_media) end
  )
  from public.profiles p
  join public.portfolios f on f.user_id = p.id
  where p.username = lower(p_username)
    and not coalesce(p.is_banned, false)
    and (
      f.user_id = auth.uid()
      or f.visibility = 'public'
      or (f.visibility = 'link' and p_key is not null and f.share_key = p_key)
    )
$$;

revoke all on function public.get_portfolio(text, text) from public;
grant execute on function public.get_portfolio(text, text) to anon, authenticated;
