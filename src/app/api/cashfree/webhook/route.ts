import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    console.log('Received Cashfree webhook payload:', JSON.stringify(payload));

    const eventType = payload.type;
    const orderId = payload.data?.order?.order_id;
    const paymentStatus = payload.data?.payment?.payment_status;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id in webhook payload' }, { status: 400 });
    }

    // Verify webhook event directly by querying Cashfree's API (bypasses signature issues and guarantees authenticity)
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const isProduction = process.env.CASHFREE_ENV === 'production';

    // Allow mock/simulation in dev environments if keys are not configured
    if (!appId || !secretKey || appId.includes('Dummy')) {
      console.log('Cashfree webhook simulation: verifying simulated order');
      if (orderId.includes('cf_mock') || orderId.includes('manual_order') || orderId.startsWith('cf_reg_')) {
        if (orderId.startsWith('cf_reg_')) {
          await processWebhookRegistration(orderId, payload.data?.order?.order_amount || 100);
        } else {
          await processWebhookOrder(orderId, orderId, payload.data?.order?.order_amount || 100);
        }
        return NextResponse.json({ success: true, message: 'Simulated webhook processed' });
      }
      return NextResponse.json({ error: 'Mock keys not configured' }, { status: 500 });
    }

    const cashfreeEndpoint = isProduction 
      ? `https://api.cashfree.com/pg/orders/${orderId}` 
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    const cfResponse = await fetch(cashfreeEndpoint, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey
      }
    });

    if (!cfResponse.ok) {
      throw new Error('Failed to verify order with Cashfree API');
    }

    const cfOrder = await cfResponse.json();

    if (cfOrder.order_status === 'PAID') {
      const paymentId = payload.data?.payment?.cf_payment_id?.toString() || `cf_pay_${orderId}`;
      if (orderId.startsWith('cf_reg_') || orderId.startsWith('pending_link_') || orderId.includes('_link_') || orderId.startsWith('pay_') || orderId.startsWith('order_') || orderId.match(/^\d+$/)) {
        const userId = payload.data?.customer_details?.customer_id || null;
        await processWebhookRegistration(orderId, Number(cfOrder.order_amount), userId);
        return NextResponse.json({ success: true, message: 'Registration processed successfully via webhook' });
      }
      await processWebhookOrder(orderId, paymentId, Number(cfOrder.order_amount));
      return NextResponse.json({ success: true, message: 'Deposit processed successfully via webhook' });
    } else {
      console.log(`Order status for ${orderId} is ${cfOrder.order_status}. Webhook ignored.`);
      // If payment failed, update status in DB
      if (cfOrder.order_status === 'FAILED') {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzrrqkfhzcfyyoreiapa.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          await supabaseAdmin
            .from('deposits')
            .update({ status: 'Failed' })
            .eq('razorpay_order_id', orderId);
        }
      }
      return NextResponse.json({ success: true, message: `Status is ${cfOrder.order_status}` });
    }
  } catch (err: any) {
    console.error('Error handling Cashfree webhook:', err);
    return NextResponse.json(
      { error: err.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processWebhookRegistration(orderId: string, amount: number, userId: string | null = null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzrrqkfhzcfyyoreiapa.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabaseAdmin.rpc('confirm_registration_payment', {
    p_order_id: orderId,
    p_amount: amount,
    p_user_id: userId
  });

  if (error) {
    console.error(`Failed to confirm registration via webhook for orderId ${orderId}:`, error);
    return;
  }

  console.log(`Registration confirmed successfully via webhook for orderId ${orderId} (data: ${JSON.stringify(data)})`);
}

async function processWebhookOrder(orderId: string, paymentId: string, amount: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzrrqkfhzcfyyoreiapa.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Resolve user ID from deposit record
  const { data: depositData, error: depositError } = await supabaseAdmin
    .from('deposits')
    .select('user_id, status')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (depositError || !depositData) {
    console.error(`No deposit record found for order ID: ${orderId}`, depositError);
    return;
  }

  // Prevent duplicate processing
  if (depositData.status === 'Completed') {
    console.log(`Payment for order ${orderId} already completed.`);
    return;
  }

  // 2. Call admin RPC function to atomically update balance, mark deposit Completed, and write transaction ledger
  const { error: rpcError } = await supabaseAdmin.rpc('admin_confirm_deposit', {
    p_user_id: depositData.user_id,
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_amount: amount
  });

  if (rpcError) {
    console.error(`Failed to credit deposit atomically via admin RPC for order ${orderId}:`, rpcError);
    return;
  }

  console.log(`Deposit of ₹${amount} successfully processed for user ${depositData.user_id} (Order: ${orderId})`);
}
