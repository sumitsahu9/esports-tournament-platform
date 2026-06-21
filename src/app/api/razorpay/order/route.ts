import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount is required and must be positive' },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if keys are placeholders or not configured
    if (!keyId || !keySecret || keyId.includes('Dummy') || keyId.includes('your_')) {
      // Return a simulated mock order for testing/fallback
      return NextResponse.json({
        id: `order_mock_${Date.now()}`,
        amount: amount * 100,
        currency: 'INR',
        mock: true
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects amount in paise (1 INR = 100 paise)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
