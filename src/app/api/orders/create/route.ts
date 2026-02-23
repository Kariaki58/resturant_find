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

    // Get or create customer user for tracking
    let customerId: string | null = null;
    
    // Normalize email for consistent lookup
    const normalizedEmail = customerInfo.email.trim().toLowerCase();
    
    // Check if customer exists by email
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('role', 'customer')
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('Found existing customer account for email:', normalizedEmail);
    } else {
      // Create customer user account automatically so they can track orders by email
      // First create auth user, then create users table entry
      try {
        // Generate a random password (customer won't need to login, just track orders)
        const randomPassword = `temp_${Math.random().toString(36).slice(2)}${Date.now()}`;
        
        console.log('Creating auth user for customer:', normalizedEmail);
        
        // Create auth user first
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: randomPassword,
          email_confirm: true, // Auto-confirm email so they can track immediately
          user_metadata: {
            full_name: customerInfo.fullName,
            phone: customerInfo.phone,
          },
        });

        if (authError || !authUser.user) {
          console.error('Error creating auth user for customer:', authError);
          // Continue without customer_id - order will still be created
        } else {
          console.log('Auth user created successfully, ID:', authUser.user.id);
          
          // Now create the users table entry
          const { data: newCustomer, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.user.id,
              email: normalizedEmail,
              full_name: customerInfo.fullName,
              phone: customerInfo.phone,
              role: 'customer',
            })
            .select('id')
            .single();

          if (!createError && newCustomer) {
            customerId = newCustomer.id;
            console.log('Successfully created customer account for email:', normalizedEmail, 'Customer ID:', customerId);
          } else {
            console.error('Error creating customer user record:', createError);
            // Clean up auth user if users table insert failed
            if (authUser.user) {
              try {
                await supabase.auth.admin.deleteUser(authUser.user.id);
                console.log('Cleaned up auth user after failed users table insert');
              } catch (deleteError) {
                console.error('Error cleaning up auth user:', deleteError);
              }
            }
            // Continue without customer_id - order will still be created
          }
        }
      } catch (error) {
        console.error('Error creating customer account:', error);
        // Continue without customer_id - order will still be created
      }
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

    // Validate and normalize delivery_method
    let normalizedDeliveryMethod = (deliveryMethod || 'pickup').toLowerCase();
    // Ensure it's one of the valid values (handle both old and new constraint)
    if (!['delivery', 'pickup', 'dine_in'].includes(normalizedDeliveryMethod)) {
      normalizedDeliveryMethod = 'pickup';
    }

    // Determine order type based on delivery method
    const orderType = normalizedDeliveryMethod === 'dine_in' ? 'dine_in' : 
                     normalizedDeliveryMethod === 'delivery' ? 'online' : 'preorder';

    // Append table number to note if order is from a scanned table
    // This is only visible to the restaurant, not the customer
    let finalNote = note || null;
    if (tableNumber) {
      const tableNote = `from table ${tableNumber}`;
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
        buyer_email: customerInfo.email.trim().toLowerCase(),
        buyer_phone: customerInfo.phone,
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

