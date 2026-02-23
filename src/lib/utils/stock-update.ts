import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Updates stock for menu items when an order is confirmed
 * Decrements stock and sets items to unavailable if stock reaches 0
 */
export async function updateStockForOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ success: boolean; updates: Array<{ menuItemId: string; newQuantity: number; setUnavailable: boolean }> }> {
  try {
    // Get all order items for this order
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      throw new Error('Failed to fetch order items');
    }

    if (!orderItems || orderItems.length === 0) {
      return { success: true, updates: [] };
    }

    // Process each order item
    const updates: Array<{ menuItemId: string; newQuantity: number; setUnavailable: boolean }> = [];

    for (const orderItem of orderItems) {
      // Get current menu item stock
      const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .select('id, quantity')
        .eq('id', orderItem.menu_item_id)
        .single();

      if (menuError || !menuItem) {
        console.error(`Error fetching menu item ${orderItem.menu_item_id}:`, menuError);
        continue; // Skip this item but continue with others
      }

      // Only decrement if stock is tracked (quantity is not null)
      if (menuItem.quantity !== null && menuItem.quantity !== undefined) {
        const currentStock = Number(menuItem.quantity);
        const orderedQuantity = Number(orderItem.quantity);
        const newQuantity = Math.max(0, currentStock - orderedQuantity); // Don't go below 0
        const setUnavailable = newQuantity === 0;

        // Update menu item stock
        const updateData: { quantity: number; available?: boolean } = {
          quantity: newQuantity,
        };

        if (setUnavailable) {
          updateData.available = false;
        }

        const { error: updateError } = await supabase
          .from('menu_items')
          .update(updateData)
          .eq('id', menuItem.id);

        if (updateError) {
          console.error(`Error updating stock for menu item ${menuItem.id}:`, updateError);
          continue; // Skip this item but continue with others
        }

        updates.push({
          menuItemId: menuItem.id,
          newQuantity,
          setUnavailable,
        });
      }
    }

    return { success: true, updates };
  } catch (error: any) {
    console.error('Error updating stock:', error);
    throw error;
  }
}

