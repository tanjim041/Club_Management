begin;
-- Anonymous users can evaluate the recipient predicate, but RLS returns no
-- recipient rows without an authenticated uid. This does not expose recipients.
grant select on public.announcement_recipients to anon;
drop policy announcement_recipients_own on public.announcement_recipients;
create policy announcement_recipients_own on public.announcement_recipients
  for select to anon, authenticated using (recipient_id = auth.uid());
commit;
