-- RPC Function: Create Pending Registration before Cashfree payment checkout
CREATE OR REPLACE FUNCTION public.create_pending_registration(
  p_tournament_id uuid,
  p_game_id text,
  p_ign text,
  p_order_id text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_total_slots integer;
  v_filled_slots integer;
  v_status text;
  v_reg_id uuid;
BEGIN
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Check slots and status
  select total_slots, filled_slots, status
  into v_total_slots, v_filled_slots, v_status
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

  -- Check duplicate registrations
  if exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = v_user_id) then
    raise exception 'You are already registered for this tournament';
  end if;

  -- Insert pending registration record
  insert into public.registrations (tournament_id, user_id, game_id, ign, payment_ref, check_in_status)
  values (p_tournament_id, v_user_id, p_game_id, p_ign, p_order_id, 'Pending')
  returning id into v_reg_id;

  return json_build_object(
    'success', true,
    'registration_id', v_reg_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC Function: Confirm Registration Payment (Auto-checks in players and logs transactions)
CREATE OR REPLACE FUNCTION public.confirm_registration_payment(
  p_order_id text,
  p_amount numeric
)
RETURNS json AS $$
DECLARE
  v_registration_id uuid;
  v_tournament_id uuid;
  v_user_id uuid;
  v_wallet_id uuid;
  v_tourney_title text;
BEGIN
  -- 1. Find the pending registration by payment_ref
  select id, tournament_id, user_id
  into v_registration_id, v_tournament_id, v_user_id
  from public.registrations
  where payment_ref = p_order_id and check_in_status = 'Pending';

  if not found then
    return json_build_object('success', false, 'message', 'Registration not found or already verified');
  end if;

  -- 2. Update check-in status to 'Checked In' (automatic approval)
  update public.registrations
  set check_in_status = 'Checked In'
  where id = v_registration_id;

  -- 3. Increment filled slots on the tournament and get title
  update public.tournaments
  set filled_slots = filled_slots + 1
  where id = v_tournament_id
  returning title into v_tourney_title;

  -- 4. Get wallet ID for the user to log transaction
  select id into v_wallet_id
  from public.wallets
  where user_id = v_user_id;

  if found and v_wallet_id is not null then
    -- Log transaction for accounting
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Entry Fee', p_amount, 'Completed', v_registration_id, 'Direct checkout payment via Cashfree for tournament ' || v_tourney_title);
  end if;

  return json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
