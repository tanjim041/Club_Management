-- A claimed address is not sufficient proof of invitation ownership.
begin;

create or replace function private.account_email(p_user_id uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select pg_catalog.lower(email) from auth.users
  where id=p_user_id and email_confirmed_at is not null;
$$;

commit;
