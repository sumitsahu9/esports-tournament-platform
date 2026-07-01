import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { order_id, amount, mock } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzrrqkfhzcfyyoreiapa.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_2MpBGXEugKt9tJ9mMuQKlw_6rzglh69';

    // Extract authorization bearer token (Supabase User JWT)
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing session token' }, { status: 401 });
    }

    // Instantiate a user-scoped Supabase client to preserve auth.uid() in RPC
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Handle mock payment verification
    if (mock) {
      const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
      if (!useMock) {
        return NextResponse.json(
          { error: 'Mock verification is disabled in production settings.' },
          { status: 400 }
        );
      }

      if (order_id.startsWith('cf_reg_')) {
        const { data, error } = await supabaseUserClient.rpc('confirm_registration_payment', {
          p_order_id: order_id,
          p_amount: Number(amount)
        });
        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Mock registration payment verified successfully', data });
      }

      const { data, error } = await supabaseUserClient.rpc('confirm_deposit', {
        p_order_id: order_id,
        p_payment_id: `pay_mock_${Date.now()}`,
        p_amount: Number(amount)
      });

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Mock payment verified successfully', data });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const isProduction = process.env.CASHFREE_ENV === 'production';

    if (!appId || !secretKey) {
      return NextResponse.json({ error: 'Cashfree credentials not configured' }, { status: 500 });
    }

    const cashfreeEndpoint = isProduction 
      ? `https://api.cashfree.com/pg/orders/${order_id}` 
      : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

    // Query Cashfree directly to get the latest status of the order securely
    const response = await fetch(cashfreeEndpoint, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey
      }
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Failed to fetch order details from Cashfree');
    }

    const cfOrder = await response.json();

    if (cfOrder.order_status !== 'PAID') {
      return NextResponse.json({ 
        success: false, 
        message: `Payment is not completed. Current status: ${cfOrder.order_status}`,
        status: cfOrder.order_status
      }, { status: 400 });
    }

    if (order_id.startsWith('cf_reg_') || order_id.startsWith('pending_link_') || order_id.includes('_link_') || order_id.startsWith('pay_') || order_id.startsWith('order_') || order_id.match(/^\d+$/)) {
      const { data, error } = await supabaseUserClient.rpc('confirm_registration_payment', {
        p_order_id: order_id,
        p_amount: Number(cfOrder.order_amount),
        p_user_id: cfOrder.customer_details?.customer_id || null
      });

      if (error) {
        console.error('Error confirming registration in DB:', error);
        throw error;
      }

      return NextResponse.json({ success: true, message: 'Registration payment verified successfully', data });
    }

    // Atomically execute SQL RPC function to credit wallet balance and log transaction ledger
    const { data, error } = await supabaseUserClient.rpc('confirm_deposit', {
      p_order_id: order_id,
      p_payment_id: `cf_pay_${order_id}`,
      p_amount: Number(cfOrder.order_amount)
    });

    if (error) {
      console.error('Error confirming deposit in DB:', error);
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Payment verified and credited successfully', data });
  } catch (err: any) {
    console.error('Error verifying Cashfree order:', err);
    return NextResponse.json(
      { error: err.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
