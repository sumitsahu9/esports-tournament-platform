import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, mock } = await request.json();

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
      const { data, error } = await supabaseUserClient.rpc('confirm_deposit', {
        p_order_id: razorpay_order_id,
        p_payment_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
        p_amount: Number(amount)
      });

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Mock payment verified successfully', data });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay secret key not configured' }, { status: 500 });
    }

    // Verify signature cryptographically
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Cryptographic signature mismatch. Invalid payment.' }, { status: 400 });
    }

    // Atomically execute SQL RPC function to credit wallet balance and log transaction ledger
    const { data, error } = await supabaseUserClient.rpc('confirm_deposit', {
      p_order_id: razorpay_order_id,
      p_payment_id: razorpay_payment_id,
      p_amount: Number(amount)
    });

    if (error) {
      console.error('Error confirming deposit in DB:', error);
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Payment verified and credited successfully', data });
  } catch (err: any) {
    console.error('Error verifying Razorpay signature:', err);
    return NextResponse.json(
      { error: err.message || 'Signature verification failed' },
      { status: 500 }
    );
  }
}
