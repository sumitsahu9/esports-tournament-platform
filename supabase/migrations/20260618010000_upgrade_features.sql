-- Upgrade database migrations with advanced features

-- 1. Alter Existing Tables
alter table public.profiles 
add column role text default 'Player' check (role in ('Player', 'Super Admin', 'Tournament Admin', 'Support Admin', 'Moderator')),
add column verification_status text default 'Pending' check (verification_status in ('Verified', 'Pending', 'Rejected'));

-- Set existing administrator to Super Admin role
update public.profiles set role = 'Super Admin' where email = 'sumit903970@gmail.com';

alter table public.wallets 
add column bonus_balance numeric not null default 0 check (bonus_balance >= 0);

alter table public.registrations 
add column check_in_status text default 'Pending' check (check_in_status in ('Checked In', 'Pending', 'DNQ')),
add column coupon_discount numeric default 0;

alter table public.withdrawals 
add column proof_image_url text;

-- 2. Create Support Tickets Tables
create table public.support_tickets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    category text not null check (category in ('Tournament Issue', 'Withdrawal Issue', 'Registration Issue', 'Account Issue', 'Technical Issue', 'Other')),
    status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved', 'Closed')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.support_messages (
    id uuid default gen_random_uuid() primary key,
    ticket_id uuid references public.support_tickets(id) on delete cascade not null,
    sender_id uuid references auth.users(id) on delete cascade not null,
    message text not null,
    is_admin boolean default false,
    created_at timestamptz default now()
);

-- 3. Create Notification System Table
create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    message text not null,
    type text not null,
    is_read boolean default false,
    created_at timestamptz default now()
);

-- 4. Create Announcement System Table
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

-- 5. Create Blacklist / Anti-Cheat Tables
create table public.banned_users (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade unique,
    banned_by uuid references auth.users(id) on delete set null,
    reason text not null,
    created_at timestamptz default now()
);

create table public.ban_logs (
    id uuid default gen_random_uuid() primary key,
    target_id text not null, -- User ID, character ID, or IGN
    type text not null check (type in ('User', 'UID', 'IGN')),
    target_value text not null,
    reason text not null,
    action_by uuid references auth.users(id) on delete set null,
    created_at timestamptz default now()
);

-- 6. Create Match Proofs Table
create table public.match_proofs (
    id uuid default gen_random_uuid() primary key,
    tournament_id uuid references public.tournaments(id) on delete cascade not null,
    title text not null,
    image_url text not null,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz default now()
);

-- 7. Create Teams / Clans Tables
create table public.teams (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    logo_url text,
    captain_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamptz default now()
);

create table public.team_members (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null unique,
    role text not null default 'Member' check (role in ('Captain', 'Member')),
    joined_at timestamptz default now()
);

-- 8. Create Coupons Tables
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

create table public.coupon_usage (
    id uuid default gen_random_uuid() primary key,
    coupon_id uuid references public.coupons(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    tournament_id uuid references public.tournaments(id) on delete cascade not null,
    used_at timestamptz default now()
);

-- 9. Create Audit Log System Table
create table public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    action_by uuid references auth.users(id) on delete set null,
    action text not null,
    target_type text not null,
    target_id text,
    details text,
    created_at timestamptz default now()
);

-- 10. Enable Row Level Security (RLS) on all new tables
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.banned_users enable row level security;
alter table public.ban_logs enable row level security;
alter table public.match_proofs enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.audit_logs enable row level security;

-- 11. Define Row Level Security Policies

-- Support Tickets: Users can read/write own, Support Admin / Super Admin / Moderators can view/all
create policy "Allow users access own tickets" on public.support_tickets
    for all using (user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Support Admin', 'Moderator'));

create policy "Allow users access messages in own tickets" on public.support_messages
    for all using (
        exists (select 1 from public.support_tickets where id = ticket_id and user_id = auth.uid())
        or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Support Admin', 'Moderator')
    );

-- Notifications: Users can view/update own notifications
create policy "Allow users read own notifications" on public.notifications
    for all using (user_id = auth.uid());

-- Announcements: Anyone can view, admins can manage
create policy "Allow public read on announcements" on public.announcements
    for select using (true);

create policy "Allow admin write on announcements" on public.announcements
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Blacklists: Public read on banned users, admin write
create policy "Allow public read on banned users" on public.banned_users
    for select using (true);

create policy "Allow admin edit banned users" on public.banned_users
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

create policy "Allow admin edit ban logs" on public.ban_logs
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

-- Match Proofs: Public read, admin write
create policy "Allow public read on match proofs" on public.match_proofs
    for select using (true);

create policy "Allow admin write on match proofs" on public.match_proofs
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Tournament Admin', 'Moderator'));

-- Teams: Public read, member write
create policy "Allow public read on teams" on public.teams
    for select using (true);

create policy "Allow captain edit own team" on public.teams
    for all using (captain_id = auth.uid());

create policy "Allow public read on team members" on public.team_members
    for select using (true);

create policy "Allow members edit own record" on public.team_members
    for all using (user_id = auth.uid() or exists (select 1 from public.teams where id = team_id and captain_id = auth.uid()));

-- Coupons: Public read for code check, admin write
create policy "Allow public read on coupons" on public.coupons
    for select using (true);

create policy "Allow admin write on coupons" on public.coupons
    for all using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

create policy "Allow users read own coupon usage" on public.coupon_usage
    for select using (user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

create policy "Allow users write coupon usage" on public.coupon_usage
    for insert with check (user_id = auth.uid());

-- Audit Logs: Admin read/write
create policy "Allow admins read audit logs" on public.audit_logs
    for select using ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));

create policy "Allow admins write audit logs" on public.audit_logs
    for insert with check ((select role from public.profiles where id = auth.uid()) in ('Super Admin', 'Moderator'));


-- 12. Create Transactional RPC Database Functions

-- Function: Register for tournament securely (UPDATED with Coupons & Bonus Wallet support)
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
  v_total_slots integer;
  v_filled_slots integer;
  v_status text;
  v_wallet_id uuid;
  v_deposit numeric;
  v_winning numeric;
  v_bonus numeric;
  v_total_bal numeric;
  
  v_coupon_id uuid;
  v_coupon_type text;
  v_coupon_value numeric;
  v_discount numeric := 0;
  
  v_final_fee numeric;
  v_deduct_bonus numeric := 0;
  v_deduct_deposit numeric := 0;
  v_deduct_winning numeric := 0;
  
  v_reg_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Verify ban status
  if exists (select 1 from public.banned_users where user_id = v_user_id) then
    raise exception 'Registration failed: Your account has been banned due to rules violation';
  end if;

  -- Lock tournament row
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

  -- Check duplicate
  if exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = v_user_id) then
    raise exception 'You are already registered for this tournament';
  end if;

  -- Handle Coupon discount
  if p_coupon_code is not null and p_coupon_code != '' then
    select id, type, value, expiry_date, usage_limit, times_used
    into v_coupon_id, v_coupon_type, v_coupon_value, v_coupon_value, v_coupon_value, v_coupon_value -- dummy binds to capture settings
    from public.coupons
    where code = p_coupon_code
    for update;

    -- Fetch clean values
    select id, type, value, expiry_date, usage_limit, times_used
    into v_coupon_id, v_coupon_type, v_coupon_value, v_coupon_value, v_coupon_value, v_coupon_value
    from public.coupons
    where code = p_coupon_code;

    if v_coupon_id is null then
      raise exception 'Invalid coupon code';
    end if;

    -- Verify coupon expiry and usage
    if now() > (select expiry_date from public.coupons where id = v_coupon_id) then
      raise exception 'Coupon code has expired';
    end if;

    if (select times_used from public.coupons where id = v_coupon_id) >= (select usage_limit from public.coupons where id = v_coupon_id) then
      raise exception 'Coupon usage limit reached';
    end if;

    -- Calculate discount
    if v_coupon_type = 'Fixed' then
      v_discount := v_coupon_value;
    else
      v_discount := (v_coupon_value / 100.0) * v_entry_fee;
    end if;
    
    if v_discount > v_entry_fee then
      v_discount := v_entry_fee;
    end if;
  end if;

  v_final_fee := v_entry_fee - v_discount;

  -- Lock user wallet
  select id, deposit_balance, winning_balance, bonus_balance
  into v_wallet_id, v_deposit, v_winning, v_bonus
  from public.wallets
  where user_id = v_user_id
  for update;

  v_total_bal := v_deposit + v_winning + v_bonus;
  if v_total_bal < v_final_fee then
    raise exception 'Insufficient wallet balance. Please add funds';
  end if;

  -- Deduct from wallets in order: Bonus -> Deposit -> Winning
  if v_final_fee > 0 then
    if v_bonus >= v_final_fee then
      v_deduct_bonus := v_final_fee;
      v_final_fee := 0;
    else
      v_deduct_bonus := v_bonus;
      v_final_fee := v_final_fee - v_bonus;
    end if;
  end if;

  if v_final_fee > 0 then
    if v_deposit >= v_final_fee then
      v_deduct_deposit := v_final_fee;
      v_final_fee := 0;
    else
      v_deduct_deposit := v_deposit;
      v_final_fee := v_final_fee - v_deposit;
    end if;
  end if;

  if v_final_fee > 0 then
    v_deduct_winning := v_final_fee;
  end if;

  -- Update wallet
  update public.wallets
  set deposit_balance = deposit_balance - v_deduct_deposit,
      winning_balance = winning_balance - v_deduct_winning,
      bonus_balance = bonus_balance - v_deduct_bonus
  where id = v_wallet_id;

  -- Insert registration
  insert into public.registrations (tournament_id, user_id, game_id, ign, coupon_discount)
  values (p_tournament_id, v_user_id, p_game_id, p_ign, v_discount)
  returning id into v_reg_id;

  -- Increment filled slots
  update public.tournaments
  set filled_slots = filled_slots + 1
  where id = p_tournament_id;

  -- Increment coupon usage
  if v_coupon_id is not null then
    update public.coupons set times_used = times_used + 1 where id = v_coupon_id;
    insert into public.coupon_usage (coupon_id, user_id, tournament_id)
    values (v_coupon_id, v_user_id, p_tournament_id);
  end if;

  -- Log transaction
  insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
  values (
    v_wallet_id,
    'Entry Fee',
    v_entry_fee - v_discount,
    'Completed',
    v_reg_id,
    'Registration fee for tournament ' || p_tournament_id || ' (Discount: ₹' || v_discount || ')'
  );

  -- Emit user notification
  insert into public.notifications (user_id, title, message, type)
  values (
    v_user_id,
    'Registration Successful',
    'You successfully registered for tournament ' || (select title from public.tournaments where id = p_tournament_id),
    'Tournament Registration Success'
  );

  return json_build_object('success', true, 'registration_id', v_reg_id, 'discount', v_discount);
end;
$$ language plpgsql security definer;


-- Function: Process withdrawal request securely (Admin only, UPDATED with Notifications & Audits)
create or replace function public.process_withdrawal(
  p_withdrawal_id uuid,
  p_approve boolean,
  p_proof_image_url text default null
)
returns json as $$
declare
  v_caller_id uuid;
  v_role text;
  v_user_id uuid;
  v_amount numeric;
  v_status text;
  v_wallet_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select role into v_role from public.profiles where id = v_caller_id;
  if v_role not in ('Super Admin', 'Support Admin', 'Moderator') then
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
    set status = 'Approved', proof_image_url = p_proof_image_url, updated_at = now()
    where id = p_withdrawal_id;

    update public.transactions
    set status = 'Completed'
    where reference_id = p_withdrawal_id and type = 'Withdrawal';

    -- Audit Log
    insert into public.audit_logs (action_by, action, target_type, target_id, details)
    values (v_caller_id, 'Approve Withdrawal', 'Withdrawal', p_withdrawal_id::text, 'Approved payout request of ₹' || v_amount);

    -- Notification
    insert into public.notifications (user_id, title, message, type)
    values (v_user_id, 'Withdrawal Approved', 'Your withdrawal request of ₹' || v_amount || ' has been approved and disbursed.', 'Withdrawal Approved');
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

    -- Audit Log
    insert into public.audit_logs (action_by, action, target_type, target_id, details)
    values (v_caller_id, 'Reject Withdrawal', 'Withdrawal', p_withdrawal_id::text, 'Rejected payout request of ₹' || v_amount);

    -- Notification
    insert into public.notifications (user_id, title, message, type)
    values (v_user_id, 'Withdrawal Rejected', 'Your withdrawal request of ₹' || v_amount || ' was rejected. Funds have been refunded to winnings wallet.', 'Withdrawal Rejected');
  end if;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;


-- Function: Auto-calculate and distribute prizes (Admin only, UPDATED with notifications, audit logs, and status checks)
create or replace function public.publish_tournament_results(
  p_tournament_id uuid,
  p_rank1_user_id uuid,
  p_rank2_user_id uuid,
  p_rank3_user_id uuid
)
returns json as $$
declare
  v_caller_id uuid;
  v_role text;
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

  select role into v_role from public.profiles where id = v_caller_id;
  if v_role not in ('Super Admin', 'Tournament Admin', 'Moderator') then
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
  v_prize_pool := 0.50 * v_collection; -- 50% split
  
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
    
    insert into public.notifications (user_id, title, message, type)
    values (p_rank1_user_id, 'You Won Rank 1!', 'Congratulations! You secured Rank 1 in match and won ₹' || v_p1, 'Winner Announcement');
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

    insert into public.notifications (user_id, title, message, type)
    values (p_rank2_user_id, 'You Won Rank 2!', 'Congratulations! You secured Rank 2 in match and won ₹' || v_p2, 'Winner Announcement');
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

    insert into public.notifications (user_id, title, message, type)
    values (p_rank3_user_id, 'You Won Rank 3!', 'Congratulations! You secured Rank 3 in match and won ₹' || v_p3, 'Winner Announcement');
  end if;

  -- Set tournament status to Completed
  update public.tournaments
  set status = 'Completed'
  where id = p_tournament_id;

  -- Audit log entry
  insert into public.audit_logs (action_by, action, target_type, target_id, details)
  values (v_caller_id, 'Publish Results', 'Tournament', p_tournament_id::text, 'Published winners and distributed ₹' || v_prize_pool || ' prizes.');

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;
