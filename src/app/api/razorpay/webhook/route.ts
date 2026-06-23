import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret.includes('Dummy')) {
      // In developer environment, allow webhook simulation if secret is not set
      console.log('Razorpay webhook simulation detected (secret not configured)');
      const payload = JSON.parse(rawBody);
      await processWebhookEvent(payload);
      return NextResponse.json({ success: true, message: 'Simulated webhook processed' });
    }

    // Verify webhook signature cryptographically
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    await processWebhookEvent(payload);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error handling Razorpay webhook:', err);
    return NextResponse.json(
      { error: err.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(payload: any) {
  const event = payload.event;
  console.log(`Processing Razorpay webhook event: ${event}`);

  if (event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const amountInRupees = payment.amount / 100; // Razorpay provides amount in paise

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzrrqkfhzcfyyoreiapa.supabase.co';
    // Webhook runs asynchronously without user session. It requires the service_role key to bypass RLS policies
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseServiceKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined. Webhook cannot execute auth-bypassed updates.');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Resolve user ID from deposit record
    const { data: depositData, error: depositError } = await supabaseAdmin
      .from('deposits')
      .select('user_id, status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (depositError) {
      console.error(`Failed to find deposit for order ID: ${orderId}`, depositError);
      return;
    }

    if (!depositData) {
      console.error(`No deposit record found for order ID: ${orderId}`);
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
      p_amount: amountInRupees
    });

    if (rpcError) {
      console.error(`Failed to credit deposit atomically via admin RPC for order ${orderId}:`, rpcError);
      return;
    }

    console.log(`Deposit of ₹${amountInRupees} successfully processed for user ${depositData.user_id} (Order: ${orderId})`);
  } else if (event === 'payment.failed') {
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzrrqkfhzcfyyoreiapa.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin
        .from('deposits')
        .update({ status: 'Failed' })
        .eq('razorpay_order_id', orderId);
      console.log(`Deposit marked as Failed for order ${orderId}`);
    }
  }
}
