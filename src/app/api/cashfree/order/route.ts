import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, customerId, customerEmail, customerPhone, returnUrl, orderId } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount is required and must be positive' },
        { status: 400 }
      );
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const isProduction = process.env.CASHFREE_ENV === 'production';

    // Check if credentials are set
    if (!appId || !secretKey || appId.includes('Dummy') || appId.includes('your_')) {
      // Return a simulated mock order for developer testing/fallback
      return NextResponse.json({
        cf_order_id: orderId || `cf_mock_${Date.now()}`,
        payment_session_id: `session_mock_${Date.now()}`,
        order_amount: amount,
        order_currency: 'INR',
        mock: true
      });
    }

    const cashfreeEndpoint = isProduction 
      ? 'https://api.cashfree.com/pg/orders' 
      : 'https://sandbox.cashfree.com/pg/orders';

    const finalOrderId = orderId || `order_${Date.now()}`;

    // Clean phone number format for Cashfree validator (must be exactly 10 digits)
    let cleanPhone = (customerPhone || '9999999999').toString().replace(/\D/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (cleanPhone.length !== 10) {
      cleanPhone = '9999999999';
    }

    // Clean customer ID format (alphanumeric, underscores, hyphens only)
    const cleanCustomerId = (customerId || 'cust_default').toString().replace(/[^a-zA-Z0-9_-]/g, '_');

    // Force HTTPS on return URL in production mode
    let finalReturnUrl = returnUrl || 'https://localhost:3000';
    if (isProduction && finalReturnUrl.startsWith('http://')) {
      finalReturnUrl = finalReturnUrl.replace('http://', 'https://');
    }

    const response = await fetch(cashfreeEndpoint, {
      method: 'POST',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: finalOrderId,
        order_amount: Number(amount),
        order_currency: 'INR',
        customer_details: {
          customer_id: cleanCustomerId,
          customer_email: customerEmail || 'customer@example.com',
          customer_phone: cleanPhone
        },
        order_meta: {
          return_url: finalReturnUrl
        }
      })
    });

    const cfOrder = await response.json();

    if (!response.ok) {
      throw new Error(cfOrder.message || 'Failed to create Cashfree order');
    }

    return NextResponse.json({
      cf_order_id: cfOrder.order_id,
      payment_session_id: cfOrder.payment_session_id,
      order_amount: cfOrder.order_amount,
      order_currency: cfOrder.order_currency,
      mock: false
    });
  } catch (err: any) {
    console.error('Error creating Cashfree order:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
