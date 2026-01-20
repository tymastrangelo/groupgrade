import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';
import { getRandomAvatarUrl } from './avatars';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      console.log('[AUTH] signIn callback - user:', user.email);
      
      if (!user.email) {
        console.log('[AUTH] No email, rejecting');
        return false;
      }

      try {
        // Check if user already exists
        console.log('[AUTH] Checking for existing user:', user.email);
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('id, role, avatar_url')
          .eq('email', user.email)
          .maybeSingle();

        if (selectError) {
          console.error('[AUTH] Select error:', selectError);
        } else {
          console.log('[AUTH] Existing user found:', existingUser);
        }

        const defaultRoleMap: Record<string, 'professor' | 'student'> = {
          'tmastrangelo@elon.edu': 'professor',
          'mastrangelo.tyler@gmail.com': 'student',
        };
        const defaultRole = user.email in defaultRoleMap ? defaultRoleMap[user.email] : undefined;

        if (!existingUser) {
          console.log('[AUTH] Creating new user:', user.email);
          const { data: newUser, error: insertError } = await supabase.from('users').insert({
            email: user.email,
            name: user.name || user.email,
            role: defaultRole,
            avatar_url: getRandomAvatarUrl(),
          }).select();
          
          if (insertError) {
            console.error('[AUTH] Insert failed:', insertError);
          } else {
            console.log('[AUTH] User created successfully:', newUser);
          }
        } else {
          // Backfill role if missing and we have a known default
          const updates: Record<string, any> = {};
          if (!existingUser.role && defaultRole) {
            console.log('[AUTH] Backfilling role for existing user:', defaultRole);
            updates.role = defaultRole;
          }
          // Assign random avatar if user doesn't have one
          if (!existingUser.avatar_url) {
            console.log('[AUTH] Assigning random avatar to existing user');
            updates.avatar_url = getRandomAvatarUrl();
          }
          if (Object.keys(updates).length) {
            await supabase.from('users').update(updates).eq('id', existingUser.id);
          }
          console.log('[AUTH] User already exists, updated metadata if needed');
        }

        console.log('[AUTH] Allowing signin');
        return true;
      } catch (error) {
        console.error('[AUTH] Unexpected error:', error);
        return true; // Still allow signin even if sync fails
      }
    },
    async session({ session }) {
      // Fetch the user's avatar from the database and add it to the session
      if (session.user?.email) {
        const { data: user } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('email', session.user.email)
          .maybeSingle();
        
        if (user?.avatar_url) {
          session.user.image = user.avatar_url;
        }
      }
      return session;
    },
  },
};
