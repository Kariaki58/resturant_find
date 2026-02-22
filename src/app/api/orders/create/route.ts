import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    // Use admin client to bypass RLS and allow unauthenticated orders
    const supabase = createAdminClient();
    const body = await req.json();

    const {
      restaurantId,
      cart,
      customerInfo,
      paymentInfo,
      note,
      tableNumber,
      deliveryMethod,
    } = body;

    // Validate required fields
    if (!restaurantId || !cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant ID and cart items are required' },
        { status: 400 }
      );
    }

    if (!customerInfo?.fullName || !customerInfo?.email || !customerInfo?.phone) {
      return NextResponse.json(
        { error: 'Customer information is required' },
        { status: 400 }
      );
    }

    if (!paymentInfo?.paymentReference || !paymentInfo?.buyerTransferName || !paymentInfo?.paymentProofUrl) {
      return NextResponse.json(
        { error: 'Payment information is required' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = cart.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0
    );

    // Get or create customer user (optional - for tracking)
    let customerId: string | null = null;
    
    // Check if customer exists by email
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('id')
      .eq('email', customerInfo.email)
      .eq('role', 'customer')
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Create customer user if they don't exist (optional - you might want to skip this)
      // For now, we'll leave customer_id as null for guest orders
    }

    // Get table_id if tableNumber is provided
    let tableId: string | null = null;
    if (tableNumber) {
      const { data: tableData } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .maybeSingle();

      if (tableData) {
        tableId = tableData.id;
      }
    }

    // Determine order type
    const orderType = tableNumber ? 'dine_in' : 'online';

    // Validate and normalize delivery_method
    let normalizedDeliveryMethod = (deliveryMethod || 'pickup').toLowerCase();
    // Ensure it's one of the valid values (handle both old and new constraint)
    if (!['delivery', 'pickup', 'dine_in'].includes(normalizedDeliveryMethod)) {
      normalizedDeliveryMethod = 'pickup';
    }

    // Append table number to note if order is from a scanned table
    let finalNote = note || null;
    if (tableNumber) {
      const tableNote = `(order from table ${tableNumber})`;
      if (finalNote) {
        finalNote = `${finalNote} ${tableNote}`;
      } else {
        finalNote = tableNote;
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_id: customerId,
        table_id: tableId,
        order_type: orderType,
        status: 'awaiting_confirmation',
        total_amount: totalAmount,
        payment_reference: paymentInfo.paymentReference,
        payment_proof_url: paymentInfo.paymentProofUrl,
        buyer_transfer_name: paymentInfo.buyerTransferName,
        note: finalNote,
        delivery_method: normalizedDeliveryMethod,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = cart.map((item: { menuItemId: string; quantity: number; price: number }) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Clean up order if items creation fails
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items', details: itemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: 'Order created successfully',
    });
  } catch (error: any) {
    console.error('Error in order creation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

