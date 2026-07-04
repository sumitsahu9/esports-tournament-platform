-- Drop old function to allow signature overload changes
DROP FUNCTION IF EXISTS public.publish_tournament_results(uuid, uuid, uuid, uuid) CASCADE;

-- Create updated publish_tournament_results RPC function supporting custom prize payouts
CREATE OR REPLACE FUNCTION public.publish_tournament_results(
  p_tournament_id uuid,
  p_rank1_user_id uuid default null,
  p_rank2_user_id uuid default null,
  p_rank3_user_id uuid default null,
  p_rank1_prize numeric default null,
  p_rank2_prize numeric default null,
  p_rank3_prize numeric default null
)
RETURNS json AS $$
DECLARE
  v_operator_role text;
  v_prize_pool numeric;
  v_status text;
  v_payout numeric;
  v_wallet_id uuid;
  v_winner_row uuid;
  v_entry_fee numeric;
  v_filled_slots integer;
BEGIN
  -- Validate operator role permissions
  select role into v_operator_role from public.profiles where id = auth.uid();
  if v_operator_role not in ('Super Admin', 'Tournament Admin', 'Moderator') then
    raise exception 'Unauthorized: Only admins or moderators can declare winners';
  end if;

  -- Lock tournament row
  select entry_fee, filled_slots, prize_pool, status 
  into v_entry_fee, v_filled_slots, v_prize_pool, v_status 
  from public.tournaments 
  where id = p_tournament_id for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_status = 'Completed' then
    raise exception 'Tournament results have already been finalized and published';
  end if;

  -- Calculate dynamic prize pool based on actual filled slots (50% of the collection) for paid matches
  if v_entry_fee > 0 then
    v_prize_pool := round(v_entry_fee * v_filled_slots * 0.50, 2);
  end if;

  -- Process Rank 1
  if p_rank1_user_id is not null then
    if not exists (select 1 from public.registrations where tournament_id = p_tournament_id and user_id = p_rank1_user_id) then
      raise exception 'Winner user ID % for Rank 1 is not registered for this tournament', p_rank1_user_id;
    end if;
    v_payout := coalesce(p_rank1_prize, round(v_prize_pool * 0.50, 2));
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
    v_payout := coalesce(p_rank2_prize, round(v_prize_pool * 0.30, 2));
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
    v_payout := coalesce(p_rank3_prize, round(v_prize_pool * 0.20, 2));
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

  -- Mark tournament as completed (Keep original prize_pool static in the database)
  update public.tournaments 
  set status = 'Completed'
  where id = p_tournament_id;

  -- Create audit log entry
  insert into public.audit_logs (action_by, action, target_type, target_id, details)
  values (
    auth.uid(),
    'Publish Results',
    'tournaments',
    p_tournament_id,
    jsonb_build_object(
      'winner1', p_rank1_user_id,
      'winner2', p_rank2_user_id,
      'winner3', p_rank3_user_id,
      'prize1', coalesce(p_rank1_prize, round(v_prize_pool * 0.50, 2)),
      'prize2', coalesce(p_rank2_prize, round(v_prize_pool * 0.30, 2)),
      'prize3', coalesce(p_rank3_prize, round(v_prize_pool * 0.20, 2))
    )
  );

  return json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
