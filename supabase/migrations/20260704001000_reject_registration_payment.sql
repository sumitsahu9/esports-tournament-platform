-- Create reject_registration_payment RPC function to handle failed/cancelled payments
CREATE OR REPLACE FUNCTION public.reject_registration_payment(
  p_order_id text,
  p_user_id uuid DEFAULT null
)
RETURNS json AS $$
DECLARE
  v_registration_id uuid;
  v_tournament_id uuid;
  v_user_id uuid;
BEGIN
  -- 1. Find the pending registration by payment_ref
  select id, tournament_id, user_id
  into v_registration_id, v_tournament_id, v_user_id
  from public.registrations
  where payment_ref = p_order_id and payment_status = 'Pending';

  -- 2. Fallback lookup by user_id
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

  -- 3. Update status to Rejected and Failed
  -- (This update triggers sync_filled_slots_trigger automatically to release/not book the slot)
  update public.registrations
  set check_in_status = 'Rejected',
      payment_status = 'Failed'
  where id = v_registration_id;

  return json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
