-- 1. Alter public.registrations to make game_id (UID) optional
ALTER TABLE public.registrations ALTER COLUMN game_id DROP NOT NULL;

-- 2. Add team member columns to registrations table
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS member2_ign TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS member3_ign TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS member4_ign TEXT;

-- 3. Add registrations_closed column to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registrations_closed BOOLEAN DEFAULT false;


-- 4. Update create_pending_registration to accept optional team member IGNs
CREATE OR REPLACE FUNCTION public.create_pending_registration(
  p_tournament_id uuid,
  p_game_id text,
  p_ign text,
  p_order_id text,
  p_member2_ign text DEFAULT null,
  p_member3_ign text DEFAULT null,
  p_member4_ign text DEFAULT null
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_total_slots integer;
  v_filled_slots integer;
  v_status text;
  v_reg_id uuid;
  v_existing_status text;
  v_existing_checkin text;
  v_registrations_closed boolean;
BEGIN
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock tournament row and check slots/registration status
  select total_slots, filled_slots, status, registrations_closed
  into v_total_slots, v_filled_slots, v_status, v_registrations_closed
  from public.tournaments
  where id = p_tournament_id for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_registrations_closed = true then
    raise exception 'Registrations are closed for this tournament';
  end if;

  if v_status != 'Upcoming' then
    raise exception 'Registration is only allowed for upcoming tournaments';
  end if;

  if v_filled_slots >= v_total_slots then
    raise exception 'Tournament lobby is full';
  end if;

  -- Check if a registration already exists
  select id, payment_status, check_in_status
  into v_reg_id, v_existing_status, v_existing_checkin
  from public.registrations
  where tournament_id = p_tournament_id and user_id = v_user_id;

  if found then
    if v_existing_status = 'Paid' or v_existing_checkin = 'Checked In' then
      raise exception 'You are already registered for this tournament';
    else
      -- Update the pending order ID, credentials, and team members to allow retry
      update public.registrations
      set payment_ref = p_order_id,
          game_id = p_game_id,
          ign = p_ign,
          member2_ign = p_member2_ign,
          member3_ign = p_member3_ign,
          member4_ign = p_member4_ign,
          created_at = now()
      where id = v_reg_id;

      return json_build_object(
        'success', true,
        'registration_id', v_reg_id
      );
    end if;
  end if;

  -- Insert new pending registration record (doesn't reserve slot yet, waiting for webhook/payment confirmation)
  insert into public.registrations (
    tournament_id, user_id, game_id, ign, payment_ref, 
    check_in_status, payment_status, member2_ign, member3_ign, member4_ign
  )
  values (
    p_tournament_id, v_user_id, p_game_id, p_ign, p_order_id, 
    'Pending', 'Pending', p_member2_ign, p_member3_ign, p_member4_ign
  )
  returning id into v_reg_id;

  return json_build_object(
    'success', true,
    'registration_id', v_reg_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Update register_via_payment_link to accept optional team member IGNs (for manual/free registration fallback)
CREATE OR REPLACE FUNCTION public.register_via_payment_link(
  p_tournament_id uuid,
  p_game_id text,
  p_ign text,
  p_payment_ref text,
  p_member2_ign text DEFAULT null,
  p_member3_ign text DEFAULT null,
  p_member4_ign text DEFAULT null
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_total_slots integer;
  v_filled_slots integer;
  v_status text;
  v_reg_id uuid;
  v_existing_status text;
  v_existing_checkin text;
  v_registrations_closed boolean;
BEGIN
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock tournament row and check slots/registration status
  select total_slots, filled_slots, status, registrations_closed
  into v_total_slots, v_filled_slots, v_status, v_registrations_closed
  from public.tournaments
  where id = p_tournament_id for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_registrations_closed = true then
    raise exception 'Registrations are closed for this tournament';
  end if;

  if v_status != 'Upcoming' then
    raise exception 'Registration is only allowed for upcoming tournaments';
  end if;

  if v_filled_slots >= v_total_slots then
    raise exception 'Tournament lobby is full';
  end if;

  -- Check if a registration already exists
  select id, payment_status, check_in_status
  into v_reg_id, v_existing_status, v_existing_checkin
  from public.registrations
  where tournament_id = p_tournament_id and user_id = v_user_id;

  if found then
    if v_existing_status = 'Paid' or v_existing_checkin = 'Checked In' then
      raise exception 'You are already registered for this tournament';
    else
      -- Update the pending reference, credentials, and team members (slot is already reserved)
      update public.registrations
      set payment_ref = p_payment_ref,
          game_id = p_game_id,
          ign = p_ign,
          member2_ign = p_member2_ign,
          member3_ign = p_member3_ign,
          member4_ign = p_member4_ign,
          created_at = now()
      where id = v_reg_id;

      return json_build_object(
        'success', true,
        'registration_id', v_reg_id
      );
    end if;
  end if;

  -- Insert new registration record with pending status (reserves slot immediately)
  insert into public.registrations (
    tournament_id, user_id, game_id, ign, payment_ref, 
    check_in_status, payment_status, member2_ign, member3_ign, member4_ign
  )
  values (
    p_tournament_id, v_user_id, p_game_id, p_ign, p_payment_ref, 
    'Pending', 'Pending', p_member2_ign, p_member3_ign, p_member4_ign
  )
  returning id into v_reg_id;

  -- Increment filled slots immediately to reserve the player's seat
  update public.tournaments
  set filled_slots = filled_slots + 1
  where id = p_tournament_id;

  return json_build_object(
    'success', true,
    'registration_id', v_reg_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
