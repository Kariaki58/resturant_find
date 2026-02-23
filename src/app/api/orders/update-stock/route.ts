import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateStockForOrder } from '@/lib/utils/stock-update';

/**
 * POST /api/orders/update-stock
 * Decrements stock for menu items when an order is confirmed
 * Sets items to unavailable if stock reaches 0
 */
export async function POST(req: Request) {
  try {
    const adminClient = createAdminClient();
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const result = await updateStockForOrder(adminClient, orderId);

    return NextResponse.json({
      success: true,
      message: 'Stock updated successfully',
      updates: result.updates,
    });
  } catch (error: any) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

