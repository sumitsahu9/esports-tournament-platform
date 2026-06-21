-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table (user settings & credentials)
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
    created_at timestamptz default now()
);

-- 2. Create Tournaments Table
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

-- 3. Create Tournament Rooms Table (Secret Room details, separate for security)
create table public.tournament_rooms (
    tournament_id uuid references public.tournaments(id) on delete cascade primary key,
    room_id text not null,
    room_password text not null,
    updated_at timestamptz default now()
);

-- 4. Create Registrations Table
create table public.registrations (
    id uuid default gen_random_uuid() primary key,
    tournament_id uuid references public.tournaments(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    game_id text not null,
    ign text not null,
    created_at timestamptz default now(),
    constraint unique_registration unique(tournament_id, user_id)
);

-- 5. Create Wallets Table
create table public.wallets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade unique,
    deposit_balance numeric not null default 0 check (deposit_balance >= 0),
    winning_balance numeric not null default 0 check (winning_balance >= 0),
    created_at timestamptz default now()
);

-- 6. Create Transactions Table
create table public.transactions (
    id uuid default gen_random_uuid() primary key,
    wallet_id uuid references public.wallets(id) on delete cascade,
    type text not null check (type in ('Deposit', 'Entry Fee', 'Prize Credit', 'Withdrawal')),
    amount numeric not null check (amount > 0),
    status text not null default 'Completed' check (status in ('Pending', 'Completed', 'Failed', 'Cancelled')),
    reference_id uuid,
    description text,
    created_at timestamptz default now()
);

-- 7. Create Withdrawals Table
create table public.withdrawals (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    upi_id text not null,
    amount numeric not null check (amount > 0),
    status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 8. Create Winners Table
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

-- 9. Create Admin Settings Table
create table public.admin_settings (
    key text primary key,
    value text not null,
    updated_at timestamptz default now()
);

-- Seed Settings
insert into public.admin_settings (key, value) values ('min_withdrawal_limit', '100');

-- 10. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_rooms enable row level security;
alter table public.registrations enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.winners enable row level security;
alter table public.admin_settings enable row level security;

-- 11. Define Row Level Security Policies

-- Profiles: Anyone can view profiles, users can modify their own
create policy "Allow public read on profiles" on public.profiles
    for select using (true);

create policy "Allow insert on own profile" on public.profiles
    for insert with check (auth.uid() = id);

create policy "Allow update on own profile" on public.profiles
    for update using (auth.uid() = id or (select is_admin from public.profiles where id = auth.uid()) = true);

-- Tournaments: Anyone can view tournaments, only admins can modify
create policy "Allow public read on tournaments" on public.tournaments
    for select using (true);

create policy "Allow admin write on tournaments" on public.tournaments
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Tournament Rooms: Only registered players of a tournament can view published room details, only admins can write
create policy "Allow registered players read room details" on public.tournament_rooms
    for select using (
        ((select room_published from public.tournaments where id = tournament_id) = true
         and exists (select 1 from public.registrations where tournament_id = tournament_rooms.tournament_id and user_id = auth.uid()))
        or (select is_admin from public.profiles where id = auth.uid()) = true
    );

create policy "Allow admin write on tournament_rooms" on public.tournament_rooms
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Registrations: Anyone can view registrations, players can insert their own (usually via RPC), admins can modify
create policy "Allow public read on registrations" on public.registrations
    for select using (true);

create policy "Allow players insert own registration" on public.registrations
    for insert with check (auth.uid() = user_id);

create policy "Allow admin write on registrations" on public.registrations
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Wallets: Users can view their own wallet, only admins/system can update
create policy "Allow user read own wallet" on public.wallets
    for select using (auth.uid() = user_id or (select is_admin from public.profiles where id = auth.uid()) = true);

create policy "Allow admin write on wallets" on public.wallets
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Transactions: Users can view transactions linked to their wallet
create policy "Allow user read own transactions" on public.transactions
    for select using (
        wallet_id in (select id from public.wallets where user_id = auth.uid())
        or (select is_admin from public.profiles where id = auth.uid()) = true
    );

create policy "Allow admin write on transactions" on public.transactions
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Withdrawals: Users can view and create their own, admins can update
create policy "Allow user read own withdrawals" on public.withdrawals
    for select using (auth.uid() = user_id or (select is_admin from public.profiles where id = auth.uid()) = true);

create policy "Allow user insert own withdrawal" on public.withdrawals
    for insert with check (auth.uid() = user_id);

create policy "Allow admin write on withdrawals" on public.withdrawals
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Winners: Anyone can view winners, only admins can write
create policy "Allow public read on winners" on public.winners
    for select using (true);

create policy "Allow admin write on winners" on public.winners
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Admin Settings: Anyone can read settings, only admins can write
create policy "Allow public read on settings" on public.admin_settings
    for select using (true);

create policy "Allow admin write on settings" on public.admin_settings
    for all using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- 12. Create Auth Triggers (Auto-Profile & Wallet creation)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    case 
      when new.email = 'sumit903970@gmail.com' then true
      else coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
    end
  );

  insert into public.wallets (user_id, deposit_balance, winning_balance)
  values (new.id, 0, 0);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 13. Create transactional RPC database functions

-- Function: Register for tournament securely
create or replace function public.register_for_tournament(
  p_tournament_id uuid,
  p_game_id text,
  p_ign text
)
returns json as $$
declare
  v_user_id uuid;
  v_entry_fee numeric;
  v_total_slots integer;
  v_filled_slots integer;
  v_status text;
  v_wallet_id uuid;
  v_deposit numeric;
  v_winning numeric;
  v_total_bal numeric;
  v_deduct_deposit numeric;
  v_deduct_winning numeric;
  v_reg_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock tournament row for update to prevent slot overflow race conditions
  select entry_fee, total_slots, filled_slots, status
  into v_entry_fee, v_total_slots, v_filled_slots, v_status
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_status != 'Upcoming' then
    raise exception 'Registrations are closed for this tournament';
  end if;

  if v_filled_slots >= v_total_slots then
    raise exception 'Tournament slots are full';
  end if;

  -- Check if already registered
  if exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = v_user_id) then
    raise exception 'You are already registered for this tournament';
  end if;

  -- Lock user wallet
  select id, deposit_balance, winning_balance
  into v_wallet_id, v_deposit, v_winning
  from public.wallets
  where user_id = v_user_id
  for update;

  v_total_bal := v_deposit + v_winning;
  if v_total_bal < v_entry_fee then
    raise exception 'Insufficient wallet balance. Please add funds';
  end if;

  -- Calculate deduction (prefer deposit balance first)
  if v_deposit >= v_entry_fee then
    v_deduct_deposit := v_entry_fee;
    v_deduct_winning := 0;
  else
    v_deduct_deposit := v_deposit;
    v_deduct_winning := v_entry_fee - v_deposit;
  end if;

  -- Update wallet
  update public.wallets
  set deposit_balance = deposit_balance - v_deduct_deposit,
      winning_balance = winning_balance - v_deduct_winning
  where id = v_wallet_id;

  -- Insert registration
  insert into public.registrations (tournament_id, user_id, game_id, ign)
  values (p_tournament_id, v_user_id, p_game_id, p_ign)
  returning id into v_reg_id;

  -- Increment filled slots
  update public.tournaments
  set filled_slots = filled_slots + 1
  where id = p_tournament_id;

  -- Log transaction
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Entry Fee',
    v_entry_fee,
    'Completed',
    v_reg_id,
    'Registration fee for tournament ' || p_tournament_id
  );

  return json_build_object('success', true, 'registration_id', v_reg_id);
end;
$$ language plpgsql security definer;

-- Function: Submit withdrawal request securely
create or replace function public.submit_withdrawal(
  p_amount numeric,
  p_upi_id text
)
returns json as $$
declare
  v_user_id uuid;
  v_min_limit numeric;
  v_wallet_id uuid;
  v_winning_bal numeric;
  v_withdrawal_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Get min limit setting
  select coalesce((value)::numeric, 100.0) into v_min_limit
  from public.admin_settings
  where key = 'min_withdrawal_limit';
  
  if v_min_limit is null then
    v_min_limit := 100.0;
  end if;

  if p_amount < v_min_limit then
    raise exception 'Minimum withdrawal limit is ₹%', v_min_limit;
  end if;

  -- Lock user wallet
  select id, winning_balance
  into v_wallet_id, v_winning_bal
  from public.wallets
  where user_id = v_user_id
  for update;

  if v_winning_bal < p_amount then
    raise exception 'Insufficient winning balance for withdrawal';
  end if;

  -- Deduct from wallet winning balance (hold the money in withdrawal)
  update public.wallets
  set winning_balance = winning_balance - p_amount
  where id = v_wallet_id;

  -- Insert withdrawal request
  insert into public.withdrawals (user_id, upi_id, amount, status)
  values (v_user_id, p_upi_id, p_amount, 'Pending')
  returning id into v_withdrawal_id;

  -- Log transaction (starts in Pending status)
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Withdrawal',
    p_amount,
    'Pending',
    v_withdrawal_id,
    'Withdrawal request to UPI: ' || p_upi_id
  );

  return json_build_object('success', true, 'withdrawal_id', v_withdrawal_id);
end;
$$ language plpgsql security definer;

-- Function: Process withdrawal request securely (Admin only)
create or replace function public.process_withdrawal(
  p_withdrawal_id uuid,
  p_approve boolean
)
returns json as $$
declare
  v_caller_id uuid;
  v_is_admin boolean;
  v_user_id uuid;
  v_amount numeric;
  v_status text;
  v_wallet_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select is_admin into v_is_admin from public.profiles where id = v_caller_id;
  if not coalesce(v_is_admin, false) then
    raise exception 'Admin access required';
  end if;

  -- Lock withdrawal record
  select user_id, amount, status
  into v_user_id, v_amount, v_status
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if v_status != 'Pending' then
    raise exception 'Withdrawal request has already been processed';
  end if;

  if p_approve then
    -- Approve withdrawal
    update public.withdrawals
    set status = 'Approved', updated_at = now()
    where id = p_withdrawal_id;

    update public.transactions
    set status = 'Completed'
    where reference_id = p_withdrawal_id and type = 'Withdrawal';
  else
    -- Reject withdrawal, refund winnings
    update public.withdrawals
    set status = 'Rejected', updated_at = now()
    where id = p_withdrawal_id;

    update public.transactions
    set status = 'Failed'
    where reference_id = p_withdrawal_id and type = 'Withdrawal';

    -- Lock and credit wallet back
    select id into v_wallet_id from public.wallets where user_id = v_user_id for update;
    
    update public.wallets
    set winning_balance = winning_balance + v_amount
    where id = v_wallet_id;
    
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (
      v_wallet_id,
      'Prize Credit',
      v_amount,
      'Completed',
      p_withdrawal_id,
      'Refund for rejected withdrawal request'
    );
  end if;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Function: Auto-calculate and distribute prizes (Admin only)
create or replace function public.publish_tournament_results(
  p_tournament_id uuid,
  p_rank1_user_id uuid,
  p_rank2_user_id uuid,
  p_rank3_user_id uuid
)
returns json as $$
declare
  v_caller_id uuid;
  v_is_admin boolean;
  v_entry_fee numeric;
  v_filled_slots integer;
  v_status text;
  v_collection numeric;
  v_prize_pool numeric;
  v_p1 numeric;
  v_p2 numeric;
  v_p3 numeric;
  v_wallet_id uuid;
  v_winner_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select is_admin into v_is_admin from public.profiles where id = v_caller_id;
  if not coalesce(v_is_admin, false) then
    raise exception 'Admin access required';
  end if;

  -- Lock tournament row
  select entry_fee, filled_slots, status
  into v_entry_fee, v_filled_slots, v_status
  from public.tournaments
  where id = p_tournament_id
  for update;

  if v_status = 'Completed' then
    raise exception 'Results have already been published for this tournament';
  end if;

  -- Verify users are registered
  if p_rank1_user_id is not null and not exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = p_rank1_user_id) then
    raise exception 'Rank 1 player is not registered for this tournament';
  end if;
  if p_rank2_user_id is not null and not exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = p_rank2_user_id) then
    raise exception 'Rank 2 player is not registered for this tournament';
  end if;
  if p_rank3_user_id is not null and not exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = p_rank3_user_id) then
    raise exception 'Rank 3 player is not registered for this tournament';
  end if;

  v_collection := v_entry_fee * v_filled_slots;
  v_prize_pool := 0.50 * v_collection; -- 50% to Prize Pool, 50% to platform revenue
  
  v_p1 := 0.50 * v_prize_pool; -- Rank 1 = 50%
  v_p2 := 0.30 * v_prize_pool; -- Rank 2 = 30%
  v_p3 := 0.20 * v_prize_pool; -- Rank 3 = 20%

  -- Insert Rank 1
  if p_rank1_user_id is not null and v_p1 > 0 then
    insert into public.winners (tournament_id, user_id, rank, prize_won)
    values (p_tournament_id, p_rank1_user_id, 1, v_p1)
    returning id into v_winner_id;

    select id into v_wallet_id from public.wallets where user_id = p_rank1_user_id for update;
    update public.wallets set winning_balance = winning_balance + v_p1 where id = v_wallet_id;
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Prize Credit', v_p1, 'Completed', v_winner_id, 'Rank 1 prize for tournament ' || p_tournament_id);
  end if;

  -- Insert Rank 2
  if p_rank2_user_id is not null and v_p2 > 0 then
    insert into public.winners (tournament_id, user_id, rank, prize_won)
    values (p_tournament_id, p_rank2_user_id, 2, v_p2)
    returning id into v_winner_id;

    select id into v_wallet_id from public.wallets where user_id = p_rank2_user_id for update;
    update public.wallets set winning_balance = winning_balance + v_p2 where id = v_wallet_id;
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Prize Credit', v_p2, 'Completed', v_winner_id, 'Rank 2 prize for tournament ' || p_tournament_id);
  end if;

  -- Insert Rank 3
  if p_rank3_user_id is not null and v_p3 > 0 then
    insert into public.winners (tournament_id, user_id, rank, prize_won)
    values (p_tournament_id, p_rank3_user_id, 3, v_p3)
    returning id into v_winner_id;

    select id into v_wallet_id from public.wallets where user_id = p_rank3_user_id for update;
    update public.wallets set winning_balance = winning_balance + v_p3 where id = v_wallet_id;
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Prize Credit', v_p3, 'Completed', v_winner_id, 'Rank 3 prize for tournament ' || p_tournament_id);
  end if;

  -- Set tournament status to Completed
  update public.tournaments
  set status = 'Completed'
  where id = p_tournament_id;

  return json_build_object(
    'success', true,
    'collection', v_collection,
    'prize_pool', v_prize_pool,
    'prizes', json_build_object('rank1', v_p1, 'rank2', v_p2, 'rank3', v_p3)
  );
end;
$$ language plpgsql security definer;

-- Function: Mock Deposit for testing
create or replace function public.deposit_mock_funds(p_amount numeric)
returns json as $$
declare
  v_user_id uuid;
  v_wallet_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select id into v_wallet_id from public.wallets where user_id = v_user_id for update;
  update public.wallets set deposit_balance = deposit_balance + p_amount where id = v_wallet_id;

  insert into public.transactions (wallet_id, type, amount, status, description)
  values (v_wallet_id, 'Deposit', p_amount, 'Completed', 'Mock fund deposit via wallet system');

  return json_build_object('success', true, 'new_deposit_balance', (select deposit_balance from public.wallets where id = v_wallet_id));
end;
$$ language plpgsql security definer;
