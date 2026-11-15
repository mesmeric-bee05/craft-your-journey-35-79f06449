-- Security hardening for scanner findings (2026-11-15)
--
-- 1) Freelancers can no longer mark their own profile as verified, or fake
--    rating / total_jobs. Verification is a platform decision and must be applied
--    by the service role (or an admin).
-- 2) Business members can no longer repoint a conversation at an arbitrary
--    Telegram chat through conversations.metadata. The chat id is owned by
--    telegram-webhook, which runs as the service role.
-- 3) Clients may only create pending transactions. Previously any business member
--    could insert a row already marked completed, fabricating ledger entries.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
$$;

comment on function public.is_service_role() is
  'True when the current request runs with the service_role JWT (server-side only).';

-- ---------------------------------------------------------------------------
-- 1. Freelancer trust fields
-- ---------------------------------------------------------------------------

create or replace function public.guard_freelancer_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_role() or public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.rating := 0;
    new.total_jobs := 0;
  else
    new.is_verified := old.is_verified;
    new.rating := old.rating;
    new.total_jobs := old.total_jobs;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_freelancer_trust_fields on public.freelancer_profiles;
create trigger guard_freelancer_trust_fields
before insert or update on public.freelancer_profiles
for each row execute function public.guard_freelancer_trust_fields();

-- ---------------------------------------------------------------------------
-- 2. Conversation metadata ownership
-- ---------------------------------------------------------------------------

create or replace function public.guard_conversation_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_role() then
    return new;
  end if;

  new.metadata := coalesce(new.metadata, '{}'::jsonb) - 'telegram_chat_id';

  -- Preserve a chat id that was bound server-side; clients cannot change it.
  if tg_op = 'UPDATE' and old.metadata is not null and old.metadata ? 'telegram_chat_id' then
    new.metadata := new.metadata || jsonb_build_object('telegram_chat_id', old.metadata -> 'telegram_chat_id');
  end if;

  return new;
end;
$$;

drop trigger if exists guard_conversation_metadata on public.conversations;
create trigger guard_conversation_metadata
before insert or update on public.conversations
for each row execute function public.guard_conversation_metadata();

-- ---------------------------------------------------------------------------
-- 3. Transactions: clients may only open a pending record
-- ---------------------------------------------------------------------------

drop policy if exists "Business members can create transactions" on public.transactions;
drop policy if exists "Business members can create pending transactions" on public.transactions;

create policy "Business members can create pending transactions"
on public.transactions
for insert
to authenticated
with check (
  public.is_business_member(auth.uid(), business_id)
  and status = 'pending'::transaction_status
  and completed_at is null
  and external_reference is null
);
