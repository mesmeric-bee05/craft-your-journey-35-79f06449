create or replace function public.normalize_ke_phone(p text) returns text language plpgsql immutable set search_path=public as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  if d = '' then return null; end if;
  if d ~ '^0[17][0-9]{8}$' then d := '254' || substr(d,2);
  elsif d ~ '^[17][0-9]{8}$' then d := '254' || d; end if;
  return '+' || d;
end $$;

create or replace function public.merge_customer_rows(_keep uuid, _dup uuid) returns void
language plpgsql security definer set search_path=public as $$
declare k public.customers; d public.customers;
begin
  select * into k from customers where id=_keep;
  select * into d from customers where id=_dup;
  if k.id is null or d.id is null or k.id=d.id or k.business_id<>d.business_id then
    raise exception 'invalid merge';
  end if;
  update conversations set customer_id=_keep where customer_id=_dup;
  update csat_responses set customer_id=_keep where customer_id=_dup;
  update workflow_executions set customer_id=_keep where customer_id=_dup;
  delete from segment_customers s where s.customer_id=_dup
    and exists (select 1 from segment_customers x where x.segment_id=s.segment_id and x.customer_id=_keep);
  update segment_customers set customer_id=_keep where customer_id=_dup;
  delete from customers where id=_dup;
  update customers set
    name = coalesce(k.name, d.name),
    phone = coalesce(k.phone, d.phone),
    email = coalesce(k.email, d.email),
    avatar_url = coalesce(k.avatar_url, d.avatar_url),
    tags = (select array_agg(distinct t) from unnest(coalesce(k.tags,'{}') || coalesce(d.tags,'{}')) t),
    notes = nullif(concat_ws(E'\n', k.notes, d.notes), ''),
    first_contact_at = least(k.first_contact_at, d.first_contact_at),
    last_contact_at = greatest(k.last_contact_at, d.last_contact_at),
    updated_at = now()
  where id=_keep;
end $$;
revoke all on function public.merge_customer_rows(uuid,uuid) from public, anon, authenticated;

create or replace function public.merge_customers(_keep uuid, _dup uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare b uuid; b2 uuid;
begin
  select business_id into b from customers where id=_keep;
  select business_id into b2 from customers where id=_dup;
  if b is null or b2 is null or b<>b2 then raise exception 'Customers not found in the same business'; end if;
  if not (exists(select 1 from businesses where id=b and owner_id=auth.uid()) or public.is_business_member(auth.uid(), b)) then
    raise exception 'Not allowed';
  end if;
  perform public.merge_customer_rows(_keep, _dup);
  perform public.log_user_action('customer_merged','customer',_keep,b,jsonb_build_object('merged_id',_dup));
  return _keep;
end $$;
revoke all on function public.merge_customers(uuid,uuid) from public, anon;
grant execute on function public.merge_customers(uuid,uuid) to authenticated;

create or replace function public.customers_dedupe_before_insert() returns trigger
language plpgsql security definer set search_path=public as $$
declare existing uuid;
begin
  new.phone := public.normalize_ke_phone(new.phone);
  new.email := nullif(lower(trim(new.email)), '');
  if tg_op = 'INSERT' then
    select id into existing from customers
     where business_id=new.business_id
       and ((new.phone is not null and phone=new.phone) or (new.email is not null and lower(email)=new.email))
     order by created_at limit 1;
    if existing is not null then
      update customers set
        name = coalesce(name, new.name),
        phone = coalesce(phone, new.phone),
        email = coalesce(email, new.email),
        tags = (select array_agg(distinct t) from unnest(coalesce(tags,'{}') || coalesce(new.tags,'{}')) t),
        notes = case when new.notes is null or coalesce(notes,'') like '%'||new.notes||'%' then notes else concat_ws(E'\n', notes, new.notes) end,
        updated_at = now()
      where id=existing;
      return null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists customers_dedupe on public.customers;
create trigger customers_dedupe before insert or update of phone, email on public.customers
for each row execute function public.customers_dedupe_before_insert();

-- Clean existing duplicates (keep oldest)
do $$
declare r record;
begin
  update customers set phone = public.normalize_ke_phone(phone), email = nullif(lower(trim(email)),'');
  for r in
    select id, first_value(id) over (partition by business_id, email order by created_at) keep
    from customers where email is not null
  loop
    if r.id <> r.keep and exists(select 1 from customers where id=r.id) then perform public.merge_customer_rows(r.keep, r.id); end if;
  end loop;
  for r in
    select id, first_value(id) over (partition by business_id, phone order by created_at) keep
    from customers where phone is not null
  loop
    if r.id <> r.keep and exists(select 1 from customers where id=r.id) then perform public.merge_customer_rows(r.keep, r.id); end if;
  end loop;
end $$;

create unique index if not exists customers_business_phone_uniq on public.customers(business_id, phone) where phone is not null;
create unique index if not exists customers_business_email_uniq on public.customers(business_id, lower(email)) where email is not null;