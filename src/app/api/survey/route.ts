import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { skills } = await request.json();

    // Get user ID from email
    console.log('Looking up user by email:', session.user.email);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError) {
      console.error('User lookup error:', userError);
      return NextResponse.json(
        { error: 'User lookup failed: ' + userError.message },
        { status: 404 }
      );
    }

    if (!user) {
      console.error('User not found for email:', session.user.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found:', user.id);

    // Upsert survey responses (allow retakes by updating existing record)
    const payload = {
      user_id: user.id,
      research_rating: skills.find((s: any) => s.name === 'Research')?.rating || 0,
      writing_rating: skills.find((s: any) => s.name === 'Writing & Editing')?.rating || 0,
      design_rating: skills.find((s: any) => s.name === 'Visual Design')?.rating || 0,
      technical_rating: skills.find((s: any) => s.name === 'Technical / Implementation')?.rating || 0,
      updated_at: new Date().toISOString(),
    };

    const { error: surveyError } = await supabase
      .from('student_strengths')
      .upsert(payload, { onConflict: 'user_id' });

    if (surveyError) {
      console.error('Survey save error:', surveyError);
      return NextResponse.json(
        { error: 'Failed to save survey' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Fetch existing survey ratings for the signed-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lookup user id by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: strengths, error: strengthsError } = await supabase
      .from('student_strengths')
      .select('research_rating, writing_rating, design_rating, technical_rating, updated_at')
      .eq('user_id', user.id)
      .single();

    if (strengthsError) {
      return NextResponse.json({ error: 'No survey found' }, { status: 404 });
    }

    return NextResponse.json({ ratings: strengths });
  } catch (error) {
    console.error('GET /api/survey error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
