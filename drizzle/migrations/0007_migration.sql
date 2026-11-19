create or replace function public.guard_freelancer_trust_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'role','') = 'service_role' or public.is_admin(auth.uid()) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_verified := false; new.rating := 0; new.total_jobs := 0;
  else
    new.is_verified := old.is_verified; new.rating := old.rating; new.total_jobs := old.total_jobs;
  end if;
  return new;
end; $$;
drop trigger if exists guard_freelancer_trust_fields on public.freelancer_profiles;
create trigger guard_freelancer_trust_fields before insert or update on public.freelancer_profiles
for each row execute function public.guard_freelancer_trust_fields();

create or replace function public.guard_business_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'role','') = 'service_role' or public.is_admin(auth.uid()) then
    return new;
  end if;
  if tg_op = 'INSERT' then new.is_verified := false;
  else new.is_verified := old.is_verified; end if;
  return new;
end; $$;
drop trigger if exists guard_business_verified on public.businesses;
create trigger guard_business_verified before insert or update on public.businesses
for each row execute function public.guard_business_verified();