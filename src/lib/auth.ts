import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

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
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (selectError) {
          console.error('[AUTH] Select error:', selectError);
        } else {
          console.log('[AUTH] Existing user found:', existingUser);
        }

        if (!existingUser) {
          console.log('[AUTH] Creating new user:', user.email);
          const { data: newUser, error: insertError } = await supabase.from('users').insert({
            email: user.email,
            name: user.name || user.email,
            role: 'student',
          }).select();
          
          if (insertError) {
            console.error('[AUTH] Insert failed:', insertError);
          } else {
            console.log('[AUTH] User created successfully:', newUser);
          }
        } else {
          console.log('[AUTH] User already exists, skipping creation');
        }

        console.log('[AUTH] Allowing signin');
        return true;
      } catch (error) {
        console.error('[AUTH] Unexpected error:', error);
        return true; // Still allow signin even if sync fails
      }
    },
  },
};
