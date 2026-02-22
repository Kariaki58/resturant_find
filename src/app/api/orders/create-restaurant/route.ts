import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a restaurant owner/staff
    const { data: userData } = await supabase
      .from('users')
      .select('restaurant_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData || !userData.restaurant_id) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 403 });
    }

    if (userData.role !== 'restaurant_owner' && userData.role !== 'restaurant_staff') {
      return NextResponse.json({ error: 'Unauthorized - Restaurant access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerName,
      tableNumber,
      cart,
      note,
    } = body;

    // Validate required fields
    if (!customerName || !cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { error: 'Customer name and cart items are required' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = cart.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0
    );

    // Use admin client for order creation
    const adminClient = createAdminClient();

    // Get table_id if tableNumber is provided
    let tableId: string | null = null;
    if (tableNumber) {
      const { data: tableData } = await adminClient
        .from('tables')
        .select('id')
        .eq('restaurant_id', userData.restaurant_id)
        .eq('table_number', tableNumber)
        .maybeSingle();

      if (tableData) {
        tableId = tableData.id;
        
        // Update table status to occupied
        await adminClient
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', tableId);
      }
    }

    // Determine order type
    const orderType = tableNumber ? 'dine_in' : 'preorder';

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

    // Create order (no payment proof required, status is confirmed)
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        restaurant_id: userData.restaurant_id,
        customer_id: null, // No customer account needed
        table_id: tableId,
        order_type: orderType,
        status: 'confirmed', // Directly confirmed, no payment needed
        total_amount: totalAmount,
        payment_reference: null,
        payment_proof_url: null,
        buyer_transfer_name: customerName, // Store customer name here
        note: finalNote,
        delivery_method: tableNumber ? 'dine_in' : 'pickup',
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

    const { error: itemsError } = await adminClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Clean up order if items creation fails
      await adminClient.from('orders').delete().eq('id', order.id);
      if (tableId) {
        // Revert table status
        await adminClient
          .from('tables')
          .update({ status: 'available' })
          .eq('id', tableId);
      }
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
    console.error('Error in restaurant order creation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

