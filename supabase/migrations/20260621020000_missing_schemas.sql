-- Upgrade database migrations with new systems requested:
-- deposits (for Razorpay), banners, referrals, referral_commissions, and match_reports

-- 1. Create Deposits Table (Razorpay tracking)
create table if not exists public.deposits (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    razorpay_order_id text not null unique,
    razorpay_payment_id text,
    amount numeric not null check (amount > 0),
    status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Failed')),
    created_at timestamptz default now()
);

-- 2. Create Banners Table (homepage dynamic banners)
create table if not exists public.banners (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    image_url text not null,
    link_url text,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- 3. Create Referrals Table (invite tracking)
create table if not exists public.referrals (
    id uuid default gen_random_uuid() primary key,
    referrer_id uuid references auth.users(id) on delete cascade not null,
    referred_id uuid references auth.users(id) on delete cascade not null unique,
    created_at timestamptz default now()
);

-- 4. Create Referral Commissions Table
create table if not exists public.referral_commissions (
    id uuid default gen_random_uuid() primary key,
    referral_id uuid references public.referrals(id) on delete cascade not null,
    commission_amount numeric not null check (commission_amount >= 0),
    status text not null default 'Pending' check (status in ('Pending', 'Paid')),
    created_at timestamptz default now()
);

-- 5. Create Match Reports Table (anti-cheat screenshot uploads & kill stats)
create table if not exists public.match_reports (
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

-- 6. Enable Row Level Security (RLS) on all new tables
alter table public.deposits enable row level security;
alter table public.banners enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.match_reports enable row level security;

-- 7. Define RLS Policies for Deposits
create policy "Allow users to read own deposits" on public.deposits
    for select using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Allow admins write own deposits" on public.deposits
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- 8. Define RLS Policies for Banners
create policy "Allow public read on banners" on public.banners
    for select using (true);
create policy "Allow admins edit banners" on public.banners
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- 9. Define RLS Policies for Referrals
create policy "Allow users to view own referrals" on public.referrals
    for select using (auth.uid() = referrer_id or auth.uid() = referred_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));
create policy "Allow public insert referrals" on public.referrals
    for insert with check (true);
create policy "Allow admin write referrals" on public.referrals
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- 10. Define RLS Policies for Referral Commissions
create policy "Allow users to read own commissions" on public.referral_commissions
    for select using (
        referral_id in (select id from public.referrals where referrer_id = auth.uid())
        or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator')
    );
create policy "Allow admin edit commissions" on public.referral_commissions
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- 11. Define RLS Policies for Match Reports
create policy "Allow players to read own match reports" on public.match_reports
    for select using (auth.uid() = user_id or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));
create policy "Allow players to insert own match reports" on public.match_reports
    for insert with check (auth.uid() = user_id);
create policy "Allow admins to edit match reports" on public.match_reports
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));

-- 12. Create secure transactional RPC function for deposits
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

  -- Prevent double spending/multiple runs for the same order
  if exists (select 1 from public.deposits where razorpay_order_id = p_order_id and status = 'Completed') then
    raise exception 'Deposit already processed';
  end if;

  -- Upsert deposit record as Completed
  insert into public.deposits (user_id, razorpay_order_id, razorpay_payment_id, amount, status)
  values (v_user_id, p_order_id, p_payment_id, p_amount, 'Completed')
  on conflict (razorpay_order_id) do update 
  set razorpay_payment_id = p_payment_id, status = 'Completed', created_at = now()
  returning id into v_deposit_id;

  -- Lock and update user wallet
  select id into v_wallet_id from public.wallets where user_id = v_user_id for update;
  update public.wallets set deposit_balance = deposit_balance + p_amount where id = v_wallet_id;

  -- Create transaction ledger entry
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Deposit',
    p_amount,
    'Completed',
    v_deposit_id,
    'Deposit via Razorpay payment gateway (Order: ' || p_order_id || ')'
  );

  -- Send notification
  insert into public.notifications (user_id, title, message, type)
  values (
    v_user_id,
    'Deposit Credited',
    '₹' || p_amount || ' deposit was successfully credited to your wallet balance.',
    'Deposit Received'
  );

  return json_build_object('success', true, 'new_deposit_balance', (select deposit_balance from public.wallets where id = v_wallet_id));
end;
$$ language plpgsql security definer;

-- 13. Create admin-scoped confirm deposit function for webhooks
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
  -- Prevent double spending/multiple runs for the same order
  if exists (select 1 from public.deposits where razorpay_order_id = p_order_id and status = 'Completed') then
    return json_build_object('success', true, 'message', 'Already processed');
  end if;

  -- Upsert deposit record as Completed
  insert into public.deposits (user_id, razorpay_order_id, razorpay_payment_id, amount, status)
  values (p_user_id, p_order_id, p_payment_id, p_amount, 'Completed')
  on conflict (razorpay_order_id) do update 
  set razorpay_payment_id = p_payment_id, status = 'Completed', created_at = now()
  returning id into v_deposit_id;

  -- Lock and update user wallet
  select id into v_wallet_id from public.wallets where user_id = p_user_id for update;
  if v_wallet_id is null then
    insert into public.wallets (user_id, deposit_balance, winning_balance)
    values (p_user_id, 0, 0)
    returning id into v_wallet_id;
  end if;

  update public.wallets set deposit_balance = deposit_balance + p_amount where id = v_wallet_id;

  -- Create transaction ledger entry
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Deposit',
    p_amount,
    'Completed',
    v_deposit_id,
    'Deposit via Razorpay payment gateway webhook (Order: ' || p_order_id || ')'
  );

  -- Send notification
  insert into public.notifications (user_id, title, message, type)
  values (
    p_user_id,
    'Deposit Credited',
    '₹' || p_amount || ' deposit was successfully credited to your wallet balance.',
    'Deposit Received'
  );

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Revoke execution from public, only allowing postgres and service_role connections
revoke execute on function public.admin_confirm_deposit(uuid, text, text, numeric) from public;
