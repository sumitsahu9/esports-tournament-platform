-- Unified Esports Tournament Platform Schema Creation
-- This script sets up all tables, row-level security (RLS) policies, triggers, and transactional RPC functions.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. DROP EXISTING CONFLICTING TABLES, FUNCTIONS, AND TRIGGERS (IDEMPOTENT)
-- =========================================================================

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.auto_update_ticket_status() cascade;
drop function if exists public.register_for_tournament(uuid, text, text, text) cascade;
drop function if exists public.declare_winners(uuid, jsonb) cascade;
drop function if exists public.publish_tournament_results(uuid, uuid, uuid, uuid) cascade;
drop function if exists public.request_withdrawal(numeric, text) cascade;
drop function if exists public.submit_withdrawal(numeric, text) cascade;
drop function if exists public.process_withdrawal(uuid, text, text) cascade;
drop function if exists public.process_withdrawal(uuid, boolean, text) cascade;
drop function if exists public.confirm_deposit(text, text, numeric) cascade;
drop function if exists public.admin_confirm_deposit(uuid, text, text, numeric) cascade;
drop function if exists public.request_manual_deposit(numeric, text) cascade;

drop table if exists public.leaderboard_overrides cascade;
drop table if exists public.leaderboard_hidden cascade;
drop table if exists public.referral_commissions cascade;
drop table if exists public.referrals cascade;
drop table if exists public.match_reports cascade;
drop table if exists public.banners cascade;
drop table if exists public.deposits cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.coupon_usage cascade;
drop table if exists public.coupons cascade;
drop table if exists public.team_members cascade;
drop table if exists public.team_invites cascade;
drop table if exists public.teams cascade;
drop table if exists public.match_proofs cascade;
drop table if exists public.ban_logs cascade;
drop table if exists public.banned_users cascade;
drop table if exists public.announcements cascade;
drop table if exists public.notifications cascade;
drop table if exists public.support_messages cascade;
drop table if exists public.support_tickets cascade;
drop table if exists public.winners cascade;
drop table if exists public.withdrawals cascade;
drop table if exists public.transactions cascade;
drop table if exists public.wallets cascade;
drop table if exists public.registrations cascade;
drop table if exists public.tournament_rooms cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.profiles cascade;
drop table if exists public.admin_settings cascade;

-- =========================================================================
-- 2. CREATE BASE AND SYSTEM TABLES
-- =========================================================================

-- Profiles Table (Linked 1-to-1 with auth.users)
create table public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    name text not null,
    email text not null,
    phone_number text,
    bgmi_character_id text,
    bgmi_ign text,
    freefire_uid text,
    freefire_ign text,
    profile_picture text,
    is_admin boolean default false,
    role text default 'Player' check (role in ('Player', 'Super Admin', 'Tournament Admin', 'Support Admin', 'Moderator')),
    verification_status text default 'Pending' check (verification_status in ('Verified', 'Pending', 'Rejected')),
    created_at timestamptz default now()
);

-- Tournaments Table
create table public.tournaments (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    game text not null check (game in ('BGMI', 'Free Fire')),
    mode text not null check (mode in ('Solo', 'Duo', 'Squad')),
    entry_fee numeric not null default 0 check (entry_fee >= 0),
    total_slots integer not null check (total_slots > 0),
    filled_slots integer not null default 0 check (filled_slots >= 0),
    start_time timestamptz not null,
    prize_pool numeric not null default 0 check (prize_pool >= 0),
    rules text,
    status text not null default 'Upcoming' check (status in ('Upcoming', 'Live', 'Completed')),
    room_published boolean default false,
    created_at timestamptz default now()
);

-- Tournament Secret Rooms
create table public.tournament_rooms (
    tournament_id uuid references public.tournaments(id) on delete cascade primary key,
    room_id text not null,
    room_password text not null,
    updated_at timestamptz default now()
);

-- Registrations Table
create table public.registrations (
    id uuid default gen_random_uuid() primary key,
    tournament_id uuid references public.tournaments(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    game_id text not null,
    ign text not null,
    check_in_status text default 'Pending' check (check_in_status in ('Checked In', 'Pending', 'DNQ')),
    coupon_discount numeric default 0,
    created_at timestamptz default now(),
    constraint unique_registration unique(tournament_id, user_id)
);

-- Wallets Table
create table public.wallets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade unique,
    deposit_balance numeric not null default 0 check (deposit_balance >= 0),
    winning_balance numeric not null default 0 check (winning_balance >= 0),
    bonus_balance numeric not null default 0 check (bonus_balance >= 0),
    created_at timestamptz default now()
);

-- Transactions Ledger Table
create table public.transactions (
    id uuid default gen_random_uuid() primary key,
    wallet_id uuid references public.wallets(id) on delete cascade,
    type text not null check (type in ('Deposit', 'Entry Fee', 'Prize Credit', 'Withdrawal', 'Refund')),
    amount numeric not null check (amount >= 0),
    status text not null default 'Completed' check (status in ('Pending', 'Completed', 'Failed', 'Cancelled')),
    reference_id uuid,
    description text,
    created_at timestamptz default now()
);

-- Withdrawals Table
create table public.withdrawals (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    upi_id text not null,
    amount numeric not null check (amount > 0),
    status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
    proof_image_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Winners Table
create table public.winners (
    id uuid default gen_random_uuid() primary key,
    tournament_id uuid references public.tournaments(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    rank integer not null check (rank in (1, 2, 3)),
    prize_won numeric not null check (prize_won >= 0),
    proof_url text,
    created_at timestamptz default now(),
    constraint unique_tournament_rank unique(tournament_id, rank),
    constraint unique_tournament_winner unique(tournament_id, user_id)
);

-- Support Tickets Table
create table public.support_tickets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    category text not null check (category in ('Tournament Issue', 'Withdrawal Issue', 'Registration Issue', 'Account Issue', 'Technical Issue', 'Other')),
    status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved', 'Closed')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Support Messages Table
create table public.support_messages (
    id uuid default gen_random_uuid() primary key,
    ticket_id uuid references public.support_tickets(id) on delete cascade not null,
    sender_id uuid references auth.users(id) on delete cascade not null,
    message text not null,
    is_admin boolean default false,
    created_at timestamptz default now()
);

-- Notifications Table
create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    message text not null,
    type text not null,
    is_read boolean default false,
    created_at timestamptz default now()
);

-- Announcements Table
create table public.announcements (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    message text not null,
    priority text not null default 'Low' check (priority in ('Low', 'Medium', 'High', 'Critical')),
    type text not null check (type in ('Tournament Announcements', 'Maintenance Alerts', 'New Feature Updates', 'Emergency Notices')),
    published_at timestamptz default now(),
    expires_at timestamptz,
    created_at timestamptz default now()
);

-- Banned Users (Anti-Cheat)
create table public.banned_users (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade unique,
    banned_by uuid references auth.users(id) on delete set null,
    reason text not null,
    created_at timestamptz default now()
);

-- Anti-Cheat Ban Audit Logs
create table public.ban_logs (
    id uuid default gen_random_uuid() primary key,
    target_id text not null,
    type text not null check (type in ('User', 'UID', 'IGN')),
    target_value text not null,
    reason text not null,
    action_by uuid references auth.users(id) on delete set null,
    created_at timestamptz default now()
);

-- Match Screenshots Proof Table
create table public.match_proofs (
    id uuid default gen_random_uuid() primary key,
    tournament_id uuid references public.tournaments(id) on delete cascade not null,
    title text not null,
    image_url text not null,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz default now()
);

-- Clans / Teams Table
create table public.teams (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    logo_url text,
    captain_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamptz default now()
);

-- Clan Members Table
create table public.team_members (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null unique,
    role text not null default 'Member' check (role in ('Captain', 'Member')),
    joined_at timestamptz default now()
);

-- Clan Invites Table
create table public.team_invites (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    team_name text not null,
    invitee_email text not null,
    status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Declined')),
    created_at timestamptz default now()
);

-- Coupons Table
create table public.coupons (
    id uuid default gen_random_uuid() primary key,
    code text not null unique,
    type text not null check (type in ('Fixed', 'Percentage')),
    value numeric not null check (value > 0),
    expiry_date timestamptz not null,
    usage_limit integer not null check (usage_limit > 0),
    times_used integer not null default 0,
    created_at timestamptz default now()
);

-- Coupon Usage Table
create table public.coupon_usage (
    id uuid default gen_random_uuid() primary key,
    coupon_id uuid references public.coupons(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    tournament_id uuid references public.tournaments(id) on delete cascade not null,
    used_at timestamptz default now()
);

-- Platform Audit Logs Table
create table public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    action_by uuid references auth.users(id) on delete set null,
    action text not null,
    target_type text not null,
    target_id text,
    details text,
    created_at timestamptz default now()
);

-- Deposits Table (Razorpay gateway orders tracker)
create table public.deposits (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    razorpay_order_id text not null unique,
    razorpay_payment_id text,
    amount numeric not null check (amount > 0),
    status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Failed')),
    created_at timestamptz default now()
);

-- Banners Table
create table public.banners (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    image_url text not null,
    link_url text,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- Referrals Table
create table public.referrals (
    id uuid default gen_random_uuid() primary key,
    referrer_id uuid references auth.users(id) on delete cascade not null,
    referred_id uuid references auth.users(id) on delete cascade not null unique,
    created_at timestamptz default now()
);

-- Referral Commissions Table
create table public.referral_commissions (
    id uuid default gen_random_uuid() primary key,
    referral_id uuid references public.referrals(id) on delete cascade not null,
    commission_amount numeric not null check (commission_amount >= 0),
    status text not null default 'Pending' check (status in ('Pending', 'Paid')),
    created_at timestamptz default now()
);

-- Anti-Cheat Match Reports / Kill stats
create table public.match_reports (
    id uuid default gen_random_uuid() primary key,
    tournament_id uuid references public.tournaments(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    screenshot_url text not null,
    kills integer default 0 check (kills >= 0),
    is_verified boolean default false,
    dispute_reason text,
    created_at timestamptz default now(),
    constraint unique_user_tournament_report unique(tournament_id, user_id)
);

-- Admin Configurations / Limits Settings Table
create table public.admin_settings (
    key text primary key,
    value text not null,
    updated_at timestamptz default now()
);

-- Seed defaults settings
insert into public.admin_settings (key, value) values ('min_withdrawal_limit', '100');

-- Leaderboard Overrides Table
create table public.leaderboard_overrides (
    id text primary key,
    username text not null,
    user_id uuid references auth.users(id) on delete set null,
    game text not null check (game in ('BGMI', 'Free Fire')),
    tab text not null check (tab in ('Weekly', 'Monthly', 'All-Time')),
    wins integer not null default 0 check (wins >= 0),
    earnings numeric not null default 0 check (earnings >= 0),
    matches integer not null default 0 check (matches >= 0),
    avatar text,
    created_at timestamptz default now()
);

-- Leaderboard Hidden / Deleted Standings Table
create table public.leaderboard_hidden (
    id text primary key,
    username text not null,
    game text not null check (game in ('BGMI', 'Free Fire')),
    tab text not null check (tab in ('Weekly', 'Monthly', 'All-Time')),
    created_at timestamptz default now()
);

-- =========================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_rooms enable row level security;
alter table public.registrations enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.winners enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.banned_users enable row level security;
alter table public.ban_logs enable row level security;
alter table public.match_proofs enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.audit_logs enable row level security;
alter table public.deposits enable row level security;
alter table public.banners enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.match_reports enable row level security;
alter table public.admin_settings enable row level security;
alter table public.leaderboard_overrides enable row level security;
alter table public.leaderboard_hidden enable row level security;

-- =========================================================================
-- 4. CONFIGURE ROW LEVEL SECURITY POLICIES
-- =========================================================================

-- Profiles
create policy "Public Profiles Read" on public.profiles for select using (true);
create policy "Insert Own Profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Update Own Profile" on public.profiles for update using (auth.uid() = id or (select role from public.profiles where id = auth.uid()) = 'Super Admin');

-- Tournaments
create policy "Public Tournaments Read" on public.tournaments for select using (true);
create policy "Admins Manage Tournaments" on public.tournaments for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));

-- Tournament Rooms
create policy "Registered Players Read Room" on public.tournament_rooms for select using (
    ((select room_published from public.tournaments where id = tournament_id) = true
     and exists (select 1 from public.registrations where tournament_id = tournament_rooms.tournament_id and user_id = auth.uid()))
    or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin')
);
create policy "Admins Manage Rooms" on public.tournament_rooms for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin'));

-- Registrations
create policy "Public Registrations Read" on public.registrations for select using (true);
create policy "Players Insert Own Registration" on public.registrations for insert with check (auth.uid() = user_id);
create policy "Admins Manage Registrations" on public.registrations for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));

-- Wallets
create policy "Read Own Wallet" on public.wallets for select using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Admins Manage Wallets" on public.wallets for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Transactions
create policy "Read Own Transactions" on public.transactions for select using (
    wallet_id in (select id from public.wallets where user_id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator')
);
create policy "Admins Manage Transactions" on public.transactions for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Withdrawals
create policy "Read Own Withdrawals" on public.withdrawals for select using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Insert Own Withdrawal" on public.withdrawals for insert with check (auth.uid() = user_id);
create policy "Admins Manage Withdrawals" on public.withdrawals for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Winners
create policy "Public Winners Read" on public.winners for select using (true);
create policy "Admins Manage Winners" on public.winners for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));

-- Support Tickets
create policy "Support Tickets Access" on public.support_tickets for all using (user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Support Admin', 'Moderator'));
create policy "Support Messages Access" on public.support_messages for all using (
    exists (select 1 from public.support_tickets where id = ticket_id and user_id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Support Admin', 'Moderator')
);

-- Notifications
create policy "Notifications Read Update Own" on public.notifications for all using (user_id = auth.uid());

-- Announcements
create policy "Public Announcements Read" on public.announcements for select using (true);
create policy "Admins Manage Announcements" on public.announcements for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Blacklist
create policy "Public Read Banned Users" on public.banned_users for select using (true);
create policy "Admins Manage Banned Users" on public.banned_users for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Admins Manage Ban Logs" on public.ban_logs for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Match Proofs
create policy "Public Read Match Proofs" on public.match_proofs for select using (true);
create policy "Admins Manage Match Proofs" on public.match_proofs for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));

-- Teams
create policy "Public Read Teams" on public.teams for select using (true);
create policy "Captains Manage Teams" on public.teams for all using (captain_id = auth.uid());
create policy "Public Read Team Members" on public.team_members for select using (true);
create policy "Members Exit Clans" on public.team_members for delete using (user_id = auth.uid());
create policy "Captains Manage Members" on public.team_members for all using (
    team_id in (select id from public.teams where captain_id = auth.uid())
);



-- Coupons & Usage
create policy "Public Read Coupons" on public.coupons for select using (true);
create policy "Admins Manage Coupons" on public.coupons for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Read Own Coupon Usage" on public.coupon_usage for select using (user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Players Insert Coupon Usage" on public.coupon_usage for insert with check (user_id = auth.uid());

-- Deposits
create policy "Read Own Deposits" on public.deposits for select using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Admins Manage Deposits" on public.deposits for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Banners
create policy "Public Read Banners" on public.banners for select using (true);
create policy "Admins Manage Banners" on public.banners for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Referrals & Commissions
create policy "Read Own Referrals" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Public Insert Referrals" on public.referrals for insert with check (true);
create policy "Read Own Commissions" on public.referral_commissions for select using (
    referral_id in (select id from public.referrals where referrer_id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator')
);
create policy "Admins Manage Referrals" on public.referrals for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Admins Manage Commissions" on public.referral_commissions for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Match Reports
create policy "Read Own Match Reports" on public.match_reports for select using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));
create policy "Insert Own Match Report" on public.match_reports for insert with check (auth.uid() = user_id);
create policy "Admins Manage Match Reports" on public.match_reports for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));

-- Settings
create policy "Public Settings Read" on public.admin_settings for select using (true);
create policy "Admins Manage Settings" on public.admin_settings for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Leaderboard Overrides
drop policy if exists "Public Read Leaderboard Overrides" on public.leaderboard_overrides;
drop policy if exists "Admins Manage Leaderboard Overrides" on public.leaderboard_overrides;
create policy "Public Read Leaderboard Overrides" on public.leaderboard_overrides for select using (true);
create policy "Admins Manage Leaderboard Overrides" on public.leaderboard_overrides for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Leaderboard Hidden
drop policy if exists "Public Read Leaderboard Hidden" on public.leaderboard_hidden;
drop policy if exists "Admins Manage Leaderboard Hidden" on public.leaderboard_hidden;
create policy "Public Read Leaderboard Hidden" on public.leaderboard_hidden for select using (true);
create policy "Admins Manage Leaderboard Hidden" on public.leaderboard_hidden for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Audit Logs
drop policy if exists "Admins Read Audit Logs" on public.audit_logs;
create policy "Admins Read Audit Logs" on public.audit_logs for select using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator')
);
drop policy if exists "Anyone Insert Audit Logs" on public.audit_logs;
create policy "Anyone Insert Audit Logs" on public.audit_logs for insert with check (
    auth.uid() = action_by or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator')
);

-- Notifications
drop policy if exists "Admins Manage Notifications" on public.notifications;
create policy "Admins Manage Notifications" on public.notifications for all using (
    (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Support Admin', 'Moderator')
);

-- Registrations
drop policy if exists "Players Update Own Registration" on public.registrations;
create policy "Players Update Own Registration" on public.registrations for update using (
    auth.uid() = user_id
);

-- Team Members
drop policy if exists "Players Join Teams" on public.team_members;
create policy "Players Join Teams" on public.team_members for insert with check (
    user_id = auth.uid()
);

-- Team Invites
drop policy if exists "Players Read Own Team Invites" on public.team_invites;
create policy "Players Read Own Team Invites" on public.team_invites for select using (
    invitee_email = (select email from public.profiles where id = auth.uid())
);
drop policy if exists "Captains Insert Team Invites" on public.team_invites;
create policy "Captains Insert Team Invites" on public.team_invites for insert with check (
    exists (select 1 from public.teams where id = team_id and captain_id = auth.uid())
);
drop policy if exists "Invitee Respond Invites" on public.team_invites;
create policy "Invitee Respond Invites" on public.team_invites for update using (
    invitee_email = (select email from public.profiles where id = auth.uid())
);

-- Teams
drop policy if exists "Players Create Teams" on public.teams;
create policy "Players Create Teams" on public.teams for insert with check (
    captain_id = auth.uid()
);

-- =========================================================================
-- 5. DEFINE DATABASE TRIGGERS
-- =========================================================================

-- Trigger to create profile and wallet automatically on user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    name, 
    email, 
    phone_number, 
    bgmi_character_id, 
    bgmi_ign, 
    freefire_uid, 
    freefire_ign, 
    is_admin, 
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'bgmi_character_id',
    new.raw_user_meta_data->>'bgmi_ign',
    new.raw_user_meta_data->>'freefire_uid',
    new.raw_user_meta_data->>'freefire_ign',
    case 
      when new.email = 'sumit903970@gmail.com' then true
      else false
    end,
    case 
      when new.email = 'sumit903970@gmail.com' then 'Super Admin'
      else 'Player'
    end
  );

  insert into public.wallets (user_id, deposit_balance, winning_balance, bonus_balance)
  values (new.id, 0, 0, 0);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to auto-update ticket status to 'In Progress' when an admin responds
create or replace function public.auto_update_ticket_status()
returns trigger as $$
begin
  if new.is_admin = true then
    update public.support_tickets 
    set status = 'In Progress', updated_at = now() 
    where id = new.ticket_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_support_message_inserted
  after insert on public.support_messages
  for each row execute procedure public.auto_update_ticket_status();

-- =========================================================================
-- 6. CONFIGURE SECURE TRANSACTIONAL PROCEDURES (RPCs)
-- =========================================================================

-- Function: Register for tournament atomically
create or replace function public.register_for_tournament(
  p_tournament_id uuid,
  p_game_id text,
  p_ign text,
  p_coupon_code text default null
)
returns json as $$
declare
  v_user_id uuid;
  v_entry_fee numeric;
  v_discount numeric := 0;
  v_final_fee numeric;
  v_total_slots integer;
  v_filled_slots integer;
  v_status text;
  v_wallet_id uuid;
  v_deposit numeric;
  v_winning numeric;
  v_bonus numeric;
  v_total_bal numeric;
  v_deduct_bonus numeric := 0;
  v_deduct_deposit numeric := 0;
  v_deduct_winning numeric := 0;
  v_coupon_id uuid;
  v_coupon_type text;
  v_coupon_value numeric;
  v_reg_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- 1. Lock tournament and retrieve slots, entry fee, status
  select entry_fee, total_slots, filled_slots, status 
  into v_entry_fee, v_total_slots, v_filled_slots, v_status 
  from public.tournaments 
  where id = p_tournament_id for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_status != 'Upcoming' then
    raise exception 'Registration is only allowed for upcoming tournaments';
  end if;

  if v_filled_slots >= v_total_slots then
    raise exception 'Tournament lobby is full';
  end if;

  -- Check if already registered
  if exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = v_user_id) then
    raise exception 'You are already registered for this tournament';
  end if;

  -- 2. Handle Coupon Code validation
  v_final_fee := v_entry_fee;
  if p_coupon_code is not null and p_coupon_code != '' then
    select id, type, value into v_coupon_id, v_coupon_type, v_coupon_value
    from public.coupons
    where code = upper(p_coupon_code) and expiry_date > now() and times_used < usage_limit;

    if v_coupon_id is null then
      raise exception 'Invalid or expired coupon code';
    end if;

    -- Prevent duplicate coupon usage by the same user
    if exists (select 1 from public.coupon_usage where coupon_id = v_coupon_id and user_id = v_user_id) then
      raise exception 'Coupon code already used';
    end if;

    if v_coupon_type = 'Fixed' then
      v_discount := v_coupon_value;
    else
      v_discount := round((v_entry_fee * (v_coupon_value / 100.0)), 2);
    end if;

    v_final_fee := greatest(0, v_entry_fee - v_discount);
  end if;

  -- 3. Lock Wallet and Check Balances
  select id, deposit_balance, winning_balance, bonus_balance 
  into v_wallet_id, v_deposit, v_winning, v_bonus 
  from public.wallets 
  where user_id = v_user_id for update;

  if not found then
    raise exception 'Player wallet not found';
  end if;

  v_total_bal := v_deposit + v_winning + v_bonus;
  if v_total_bal < v_final_fee then
    raise exception 'Insufficient wallet balance. Total required: ₹%', v_final_fee;
  end if;

  -- 4. Deduct balances (Bonus -> Deposit -> Winnings order)
  if v_final_fee > 0 then
    -- Deduct bonus balance
    v_deduct_bonus := least(v_bonus, v_final_fee);
    v_final_fee := v_final_fee - v_deduct_bonus;

    -- Deduct deposit balance
    if v_final_fee > 0 then
      v_deduct_deposit := least(v_deposit, v_final_fee);
      v_final_fee := v_final_fee - v_deduct_deposit;
    end if;

    -- Deduct winning balance
    if v_final_fee > 0 then
      v_deduct_winning := least(v_winning, v_final_fee);
      v_final_fee := v_final_fee - v_deduct_winning;
    end if;

    -- Update wallet balance values
    update public.wallets 
    set bonus_balance = bonus_balance - v_deduct_bonus,
        deposit_balance = deposit_balance - v_deduct_deposit,
        winning_balance = winning_balance - v_deduct_winning
    where id = v_wallet_id;
  end if;

  -- 5. Record Coupon Usage (if valid)
  if v_coupon_id is not null then
    insert into public.coupon_usage (coupon_id, user_id, tournament_id)
    values (v_coupon_id, v_user_id, p_tournament_id);

    update public.coupons set times_used = times_used + 1 where id = v_coupon_id;
  end if;

  -- 6. Insert Registration
  insert into public.registrations (tournament_id, user_id, game_id, ign, coupon_discount)
  values (p_tournament_id, v_user_id, p_game_id, p_ign, v_discount)
  returning id into v_reg_id;

  -- Increment filled slots count
  update public.tournaments 
  set filled_slots = filled_slots + 1 
  where id = p_tournament_id;

  -- 7. Record Transaction Ledger Log
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Entry Fee',
    (v_deduct_bonus + v_deduct_deposit + v_deduct_winning),
    'Completed',
    v_reg_id,
    'Tournament Entry Registration Fee (Applied discount: ₹' || v_discount || ')'
  );

  -- 8. Send registration success notification
  insert into public.notifications (user_id, title, message, type)
  values (
    v_user_id,
    'Registration Success',
    'Successfully joined match slot for tournament ID: ' || p_tournament_id,
    'Tournament Registration'
  );

  return json_build_object(
    'success', true, 
    'registration_id', v_reg_id,
    'discount_applied', v_discount,
    'final_fee_deducted', (v_deduct_bonus + v_deduct_deposit + v_deduct_winning)
  );
end;
$$ language plpgsql security definer;

-- Function: Declare tournament winners and automatically split payouts (50% / 30% / 20%)
create or replace function public.publish_tournament_results(
  p_tournament_id uuid,
  p_rank1_user_id uuid default null,
  p_rank2_user_id uuid default null,
  p_rank3_user_id uuid default null
)
returns json as $$
declare
  v_operator_role text;
  v_prize_pool numeric;
  v_status text;
  v_payout numeric;
  v_wallet_id uuid;
  v_winner_row uuid;
begin
  -- Validate operator role permissions
  select role into v_operator_role from public.profiles where id = auth.uid();
  if v_operator_role not in ('Super Admin', 'Tournament Admin', 'Moderator') then
    raise exception 'Unauthorized: Only admins or moderators can declare winners';
  end if;

  -- Lock tournament row
  select prize_pool, status into v_prize_pool, v_status 
  from public.tournaments 
  where id = p_tournament_id for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_status = 'Completed' then
    raise exception 'Tournament results have already been finalized and published';
  end if;

  -- Process Rank 1
  if p_rank1_user_id is not null then
    if not exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = p_rank1_user_id) then
      raise exception 'Winner user ID % for Rank 1 is not registered for this tournament', p_rank1_user_id;
    end if;
    v_payout := round(v_prize_pool * 0.50, 2);
    select id into v_wallet_id from public.wallets where user_id = p_rank1_user_id for update;
    update public.wallets set winning_balance = winning_balance + v_payout where id = v_wallet_id;
    insert into public.winners (tournament_id, user_id, rank, prize_won)
    values (p_tournament_id, p_rank1_user_id, 1, v_payout)
    returning id into v_winner_row;
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Prize Credit', v_payout, 'Completed', v_winner_row, 'Esports Tournament prize credit for Rank 1 placement');
    insert into public.notifications (user_id, title, message, type)
    values (p_rank1_user_id, 'Prize Money Credited!', 'Congratulations! You placed Rank 1 and won ₹' || v_payout || ' winnings credit.', 'Prize Earned');
  end if;

  -- Process Rank 2
  if p_rank2_user_id is not null then
    if not exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = p_rank2_user_id) then
      raise exception 'Winner user ID % for Rank 2 is not registered for this tournament', p_rank2_user_id;
    end if;
    v_payout := round(v_prize_pool * 0.30, 2);
    select id into v_wallet_id from public.wallets where user_id = p_rank2_user_id for update;
    update public.wallets set winning_balance = winning_balance + v_payout where id = v_wallet_id;
    insert into public.winners (tournament_id, user_id, rank, prize_won)
    values (p_tournament_id, p_rank2_user_id, 2, v_payout)
    returning id into v_winner_row;
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Prize Credit', v_payout, 'Completed', v_winner_row, 'Esports Tournament prize credit for Rank 2 placement');
    insert into public.notifications (user_id, title, message, type)
    values (p_rank2_user_id, 'Prize Money Credited!', 'Congratulations! You placed Rank 2 and won ₹' || v_payout || ' winnings credit.', 'Prize Earned');
  end if;

  -- Process Rank 3
  if p_rank3_user_id is not null then
    if not exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = p_rank3_user_id) then
      raise exception 'Winner user ID % for Rank 3 is not registered for this tournament', p_rank3_user_id;
    end if;
    v_payout := round(v_prize_pool * 0.20, 2);
    select id into v_wallet_id from public.wallets where user_id = p_rank3_user_id for update;
    update public.wallets set winning_balance = winning_balance + v_payout where id = v_wallet_id;
    insert into public.winners (tournament_id, user_id, rank, prize_won)
    values (p_tournament_id, p_rank3_user_id, 3, v_payout)
    returning id into v_winner_row;
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Prize Credit', v_payout, 'Completed', v_winner_row, 'Esports Tournament prize credit for Rank 3 placement');
    insert into public.notifications (user_id, title, message, type)
    values (p_rank3_user_id, 'Prize Money Credited!', 'Congratulations! You placed Rank 3 and won ₹' || v_payout || ' winnings credit.', 'Prize Earned');
  end if;

  -- Mark tournament as completed
  update public.tournaments set status = 'Completed' where id = p_tournament_id;

  -- Create audit log entry
  insert into public.audit_logs (action_by, action, target_type, target_id, details)
  values (
    auth.uid(),
    'Publish Tournament Results',
    'Tournament',
    p_tournament_id::text,
    'Finalized standings and distributed ₹' || v_prize_pool || ' total prize pool'
  );

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Function: Submit a withdrawal securely (instantly deducts winnings to prevent double-spending)
create or replace function public.submit_withdrawal(
  p_amount numeric,
  p_upi_id text
)
returns json as $$
declare
  v_user_id uuid;
  v_min_limit numeric;
  v_wallet_id uuid;
  v_winnings numeric;
  v_withdrawal_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero';
  end if;

  -- Get minimum withdrawal limit settings
  select value::numeric into v_min_limit from public.admin_settings where key = 'min_withdrawal_limit';
  if v_min_limit is null then
    v_min_limit := 100;
  end if;

  if p_amount < v_min_limit then
    raise exception 'Minimum withdrawal limit is ₹%', v_min_limit;
  end if;

  -- Lock wallet
  select id, winning_balance into v_wallet_id, v_winnings 
  from public.wallets 
  where user_id = v_user_id for update;

  if v_winnings < p_amount then
    raise exception 'Insufficient winnings balance. Available: ₹%', v_winnings;
  end if;

  -- Instantly deduct winnings to reserve them securely
  update public.wallets set winning_balance = winning_balance - p_amount where id = v_wallet_id;

  -- Create withdrawal record
  insert into public.withdrawals (user_id, upi_id, amount, status)
  values (v_user_id, p_upi_id, p_amount, 'Pending')
  returning id into v_withdrawal_id;

  -- Create pending ledger log
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Withdrawal',
    p_amount,
    'Pending',
    v_withdrawal_id,
    'Withdrawal request to UPI: ' || p_upi_id
  );

  return json_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'withdrawn_amount', p_amount,
    'remaining_winning_balance', (v_winnings - p_amount)
  );
end;
$$ language plpgsql security definer;

-- Function: Admin process withdrawals requests (Approve or Reject with instant refunds)
create or replace function public.process_withdrawal(
  p_withdrawal_id uuid,
  p_approve boolean,
  p_proof_image_url text default null
)
returns json as $$
declare
  v_operator_role text;
  v_user_id uuid;
  v_amount numeric;
  v_status text;
  v_wallet_id uuid;
  v_log_action text;
begin
  -- Validate operator permissions
  select role into v_operator_role from public.profiles where id = auth.uid();
  if v_operator_role not in ('Super Admin', 'Moderator') then
    raise exception 'Unauthorized: Only admins or moderators can process withdrawals';
  end if;

  -- Lock withdrawal request record
  select user_id, amount, status into v_user_id, v_amount, v_status 
  from public.withdrawals 
  where id = p_withdrawal_id for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if v_status != 'Pending' then
    raise exception 'Withdrawal request has already been processed';
  end if;

  -- Handle Approval Action
  if p_approve = true then
    v_log_action := 'Approve';
    update public.withdrawals 
    set status = 'Approved', proof_image_url = p_proof_image_url, updated_at = now() 
    where id = p_withdrawal_id;

    -- Complete transaction record
    update public.transactions 
    set status = 'Completed', description = description || ' (Approved by administrator)'
    where reference_id = p_withdrawal_id;

    -- Notify user
    insert into public.notifications (user_id, title, message, type)
    values (
      v_user_id,
      'Withdrawal Approved',
      'Your withdrawal request of ₹' || v_amount || ' has been approved. Funds sent to your UPI ID.',
      'Withdrawal Update'
    );

  -- Handle Rejection Action (issues wallet refund)
  else
    v_log_action := 'Reject';
    update public.withdrawals 
    set status = 'Rejected', updated_at = now() 
    where id = p_withdrawal_id;

    -- Revert / Lock user wallet and credit back the reserved balance
    select id into v_wallet_id from public.wallets where user_id = v_user_id for update;
    update public.wallets set winning_balance = winning_balance + v_amount where id = v_wallet_id;

    -- Fail the initial transaction ledger log
    update public.transactions 
    set status = 'Failed', description = description || ' (Rejected by administrator)'
    where reference_id = p_withdrawal_id;

    -- Add a refund transaction
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (
      v_wallet_id,
      'Refund',
      v_amount,
      'Completed',
      p_withdrawal_id,
      'Refunded withdrawal request (Rejected by administrator)'
    );

    -- Notify user
    insert into public.notifications (user_id, title, message, type)
    values (
      v_user_id,
      'Withdrawal Rejected',
      'Your withdrawal request of ₹' || v_amount || ' was rejected. Winnings balance has been refunded.',
      'Withdrawal Update'
    );
  end if;

  -- Log action in audit log
  insert into public.audit_logs (action_by, action, target_type, target_id, details)
  values (
    auth.uid(),
    v_log_action || ' Withdrawal',
    'Withdrawal',
    p_withdrawal_id::text,
    'Processed withdrawal request of ₹' || v_amount
  );

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Function: Client-scoped Razorpay deposits confirmation
create or replace function public.confirm_deposit(
  p_order_id text,
  p_payment_id text,
  p_amount numeric
)
returns json as $$
declare
  v_user_id uuid;
  v_wallet_id uuid;
  v_deposit_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Prevent duplicate processing
  if exists (select 1 from public.deposits where razorpay_order_id = p_order_id and status = 'Completed') then
    raise exception 'Deposit order has already been processed';
  end if;

  -- Save completed deposit
  insert into public.deposits (user_id, razorpay_order_id, razorpay_payment_id, amount, status)
  values (v_user_id, p_order_id, p_payment_id, p_amount, 'Completed')
  on conflict (razorpay_order_id) do update 
  set razorpay_payment_id = p_payment_id, status = 'Completed', created_at = now()
  returning id into v_deposit_id;

  -- Lock and credit wallet
  select id into v_wallet_id from public.wallets where user_id = v_user_id for update;
  update public.wallets set deposit_balance = deposit_balance + p_amount where id = v_wallet_id;

  -- Transaction Ledger Log
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Deposit',
    p_amount,
    'Completed',
    v_deposit_id,
    'Deposit via Razorpay payment gateway (Order ID: ' || p_order_id || ')'
  );

  -- Send notification
  insert into public.notifications (user_id, title, message, type)
  values (
    v_user_id,
    'Deposit Credited',
    '₹' || p_amount || ' deposit credited successfully to your wallet.',
    'Deposit Received'
  );

  return json_build_object('success', true, 'new_deposit_balance', (select deposit_balance from public.wallets where id = v_wallet_id));
end;
$$ language plpgsql security definer;

-- Function: Admin-scoped webhook Razorpay deposits confirmation
create or replace function public.admin_confirm_deposit(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text,
  p_amount numeric
)
returns json as $$
declare
  v_wallet_id uuid;
  v_deposit_id uuid;
begin
  -- Prevent duplicate processing
  if exists (select 1 from public.deposits where razorpay_order_id = p_order_id and status = 'Completed') then
    return json_build_object('success', true, 'message', 'Already processed');
  end if;

  -- Save completed deposit
  insert into public.deposits (user_id, razorpay_order_id, razorpay_payment_id, amount, status)
  values (p_user_id, p_order_id, p_payment_id, p_amount, 'Completed')
  on conflict (razorpay_order_id) do update 
  set razorpay_payment_id = p_payment_id, status = 'Completed', created_at = now()
  returning id into v_deposit_id;

  -- Lock and credit wallet (ensure wallet exists first)
  select id into v_wallet_id from public.wallets where user_id = p_user_id for update;
  if v_wallet_id is null then
    insert into public.wallets (user_id, deposit_balance, winning_balance)
    values (p_user_id, 0, 0)
    returning id into v_wallet_id;
  end if;

  update public.wallets set deposit_balance = deposit_balance + p_amount where id = v_wallet_id;

  -- Transaction Ledger Log
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Deposit',
    p_amount,
    'Completed',
    v_deposit_id,
    'Deposit via Razorpay gateway webhook (Order ID: ' || p_order_id || ')'
  );

  -- Send notification
  insert into public.notifications (user_id, title, message, type)
  values (
    p_user_id,
    'Deposit Credited',
    '₹' || p_amount || ' deposit credited successfully to your wallet.',
    'Deposit Received'
  );

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Revoke function from public execution for webhook security
revoke execute on function public.admin_confirm_deposit(uuid, text, text, numeric) from public;

-- Function: Request a manual UPI deposit securely (credits instantly, registers pending status for verification)
create or replace function public.request_manual_deposit(
  p_amount numeric,
  p_upi_ref text
)
returns json as $$
declare
  v_user_id uuid;
  v_wallet_id uuid;
  v_deposit_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero';
  end if;

  -- 1. Lock and retrieve user's wallet
  select id into v_wallet_id from public.wallets where user_id = v_user_id for update;
  if v_wallet_id is null then
    raise exception 'User wallet not found';
  end if;

  -- 2. Create pending deposit record
  insert into public.deposits (user_id, razorpay_order_id, razorpay_payment_id, amount, status)
  values (
    v_user_id, 
    'manual_order_' || (extract(epoch from now()) * 1000)::bigint::text || '_' || floor(random()*1000)::text, 
    p_upi_ref, 
    p_amount, 
    'Pending'
  )
  returning id into v_deposit_id;

  -- 3. Credit wallet balance instantly (manual fallback credit behavior)
  update public.wallets set deposit_balance = deposit_balance + p_amount where id = v_wallet_id;

  -- 4. Create pending transaction log
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Deposit',
    p_amount,
    'Pending',
    v_deposit_id,
    'Manual UPI deposit (UPI Ref: ' || p_upi_ref || ')'
  );

  return json_build_object(
    'success', true,
    'deposit_id', v_deposit_id,
    'new_deposit_balance', (select deposit_balance from public.wallets where id = v_wallet_id)
  );
end;
$$ language plpgsql security definer;
