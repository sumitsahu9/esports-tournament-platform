-- Add payment_link column to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- Add payment_ref column to registrations table
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_ref TEXT;

-- RPC Function: Register for tournament via payment link
CREATE OR REPLACE FUNCTION public.register_via_payment_link(
  p_tournament_id uuid,
  p_game_id text,
  p_ign text,
  p_payment_ref text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_total_slots integer;
  v_filled_slots integer;
  v_reg_id uuid;
BEGIN
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- 1. Lock tournament and check slot availability
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

  -- 2. Prevent duplicate registrations
  if exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = v_user_id) then
    raise exception 'You are already registered for this tournament';
  end if;

  -- 3. Insert registration record with payment reference
  insert into public.registrations (tournament_id, user_id, game_id, ign, payment_ref, check_in_status)
  values (p_tournament_id, v_user_id, p_game_id, p_ign, p_payment_ref, 'Pending')
  returning id into v_reg_id;

  -- 4. Update tournament slots
  update public.tournaments
  set filled_slots = filled_slots + 1
  where id = p_tournament_id;

  return json_build_object(
    'success', true,
    'registration_id', v_reg_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
