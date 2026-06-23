-- Drop old case-sensitive policies
drop policy if exists "Players Read Own Team Invites" on public.team_invites;
drop policy if exists "Invitee Respond Invites" on public.team_invites;

-- Create updated case-insensitive policies
create policy "Players Read Own Team Invites" on public.team_invites
for select
using (
    lower(invitee_email) = lower((select email from public.profiles where id = auth.uid()))
);

create policy "Invitee Respond Invites" on public.team_invites
for update
using (
    lower(invitee_email) = lower((select email from public.profiles where id = auth.uid()))
);
