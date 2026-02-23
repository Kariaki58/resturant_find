import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/restaurants/search?q=restaurant_name
 * Server-side search for restaurants by name
 * Returns restaurant slug for redirecting to menu page
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search restaurants by name (case-insensitive, partial match)
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, slug')
      .ilike('name', `%${query.trim()}%`)
      .limit(10);

    if (error) {
      console.error('Error searching restaurants:', error);
      return NextResponse.json(
        { error: 'Failed to search restaurants', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurants: restaurants || [],
    });
  } catch (error: any) {
    console.error('Error in restaurant search:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

