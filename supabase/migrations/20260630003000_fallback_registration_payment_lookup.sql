-- Update confirm_registration_payment to support fallback lookup by p_user_id (for custom payment link checkouts)
CREATE OR REPLACE FUNCTION public.confirm_registration_payment(
  p_order_id text,
  p_amount numeric,
  p_user_id uuid DEFAULT null
)
RETURNS json AS $$
DECLARE
  v_registration_id uuid;
  v_tournament_id uuid;
  v_user_id uuid;
  v_wallet_id uuid;
  v_tourney_title text;
BEGIN
  -- 1. Try to find the pending registration directly by payment_ref
  select id, tournament_id, user_id
  into v_registration_id, v_tournament_id, v_user_id
  from public.registrations
  where payment_ref = p_order_id and payment_status = 'Pending';

  -- 2. Fallback: If not found, look up any pending registration for the specified user on this database
  if not found then
    v_user_id := coalesce(p_user_id, auth.uid());
    if v_user_id is not null then
      select id, tournament_id
      into v_registration_id, v_tournament_id
      from public.registrations
      where user_id = v_user_id and payment_status = 'Pending'
      order by created_at desc
      limit 1;
    end if;
  end if;

  if v_registration_id is null then
    return json_build_object('success', false, 'message', 'Registration not found or already verified');
  end if;

  -- 3. Update check-in and payment status (automatic approval) and record actual Cashfree Order ID
  update public.registrations
  set check_in_status = 'Checked In',
      payment_status = 'Paid',
      payment_ref = p_order_id
  where id = v_registration_id;

  -- 4. Increment filled slots on the tournament and retrieve title
  update public.tournaments
  set filled_slots = filled_slots + 1
  where id = v_tournament_id
  returning title into v_tourney_title;

  -- 5. Retrieve user's wallet to log ledger transaction
  select id into v_wallet_id
  from public.wallets
  where user_id = v_user_id;

  if found and v_wallet_id is not null then
    insert into public.transactions (wallet_id, type, amount, status, reference_id, description)
    values (v_wallet_id, 'Entry Fee', p_amount, 'Completed', v_registration_id, 'Direct checkout payment via Cashfree for tournament ' || v_tourney_title);
  end if;

  return json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
