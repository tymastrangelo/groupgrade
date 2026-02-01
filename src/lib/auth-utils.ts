import { supabaseAdmin } from './supabase';

export type UserWithRole = {
  id: string;
  role: string;
  normalizedRole: 'teacher' | 'student';
};

/**
 * Fetches the current user from the database by their session email.
 * Normalizes the role from 'professor' to 'teacher' for consistent frontend use.
 *
 * @throws Error if user is not found or database query fails
 */
export async function getCurrentUser(sessionEmail: string): Promise<UserWithRole> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('email', sessionEmail)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!user) throw new Error('User not found');

  return {
    ...user,
    normalizedRole: user.role === 'professor' ? 'teacher' : 'student',
  };
}
