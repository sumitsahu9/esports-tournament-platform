-- Trigger function to automatically recalculate and sync filled_slots on the tournament
CREATE OR REPLACE FUNCTION public.trg_sync_filled_slots()
RETURNS TRIGGER AS $$
DECLARE
  v_tournament_id uuid;
  v_count integer;
BEGIN
  v_tournament_id := coalesce(NEW.tournament_id, OLD.tournament_id);

  -- Recalculate confirmed and reserved slots for the tournament
  select count(*) into v_count
  from public.registrations
  where tournament_id = v_tournament_id
    and (
      check_in_status = 'Checked In'
      or payment_status = 'Paid'
      -- Include pending registrations that have a manual reference (UTR/Transaction ID) to reserve the seat
      or (check_in_status = 'Pending' and payment_ref is not null and payment_ref not like 'cf_reg_%' and payment_ref not like 'pending_link_%')
    );

  -- Update the tournament's filled_slots
  update public.tournaments
  set filled_slots = v_count
  where id = v_tournament_id;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers to prevent double-calculations
DROP TRIGGER IF EXISTS decrement_filled_slots_trigger ON public.registrations;
DROP TRIGGER IF EXISTS sync_filled_slots_trigger ON public.registrations;

-- Register the unified sync trigger on the registrations table
CREATE TRIGGER sync_filled_slots_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_filled_slots();


-- Update confirm_registration_payment to remove manual increment of filled_slots (now handled automatically by the trigger)
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
  -- (This update triggers sync_filled_slots_trigger automatically)
  update public.registrations
  set check_in_status = 'Checked In',
      payment_status = 'Paid',
      payment_ref = p_order_id
  where id = v_registration_id;

  -- 4. Retrieve tournament title
  select title into v_tourney_title
  from public.tournaments
  where id = v_tournament_id;

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


-- Run a one-time sync to update filled_slots for all existing tournaments in the database
UPDATE public.tournaments t
SET filled_slots = (
  select count(*)
  from public.registrations r
  where r.tournament_id = t.id
    and (
      r.check_in_status = 'Checked In'
      or r.payment_status = 'Paid'
      or (r.check_in_status = 'Pending' and r.payment_ref is not null and r.payment_ref not like 'cf_reg_%' and r.payment_ref not like 'pending_link_%')
    )
);
