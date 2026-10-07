drop policy if exists "Authenticated users can view freelancer profiles" on public.freelancer_profiles;
create policy "Freelancers and hiring businesses can view profiles" on public.freelancer_profiles
for select to authenticated using (
  auth.uid() = user_id
  or exists (select 1 from public.businesses b where b.owner_id = auth.uid())
  or exists (select 1 from public.business_members m where m.user_id = auth.uid() and m.is_active)
);

drop policy if exists "Authenticated users can view reviews" on public.reviews;
create policy "Job parties can view reviews" on public.reviews
for select to authenticated using (
  auth.uid() = reviewer_id or auth.uid() = reviewee_id
  or exists (
    select 1 from public.contracts c
    left join public.freelancer_profiles f on f.id = c.freelancer_id
    where c.id = reviews.contract_id
      and (f.user_id = auth.uid()
           or exists (select 1 from public.businesses b where b.id = c.business_id and b.owner_id = auth.uid())
           or public.is_business_member(auth.uid(), c.business_id))
  )
);