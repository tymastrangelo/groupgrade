# GroupGrade 📚

A modern, clean web application for managing group projects in classroom settings. Professors can create and manage projects, while students can join groups and collaborate.

## Features

- 🔐 **Google OAuth Authentication** - Secure login with Google accounts
- 👨‍🏫 **Professor Dashboard** - Create projects, manage student groups, and track progress
- ��‍🎓 **Student Dashboard** - Join project groups and collaborate with teammates
- 📊 **Analytics** - Track project submissions and grades
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 🗄️ **Database Integration** - Supabase backend for data persistence

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Supabase
- **Icons**: Lucide React, React Icons

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local` with your Supabase keys:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Getting Supabase Keys

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the `anon` key and `service_role` key

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/auth/[...nextauth]/    # NextAuth API route
│   ├── auth/signin/                # Sign-in page
│   ├── dashboard/                  # Main dashboard
│   ├── layout.tsx                  # Root layout with AuthProvider
│   └── page.tsx                    # Home page (redirects to auth)
├── components/
│   └── AuthProvider.tsx            # Session provider wrapper
├── lib/
│   ├── auth.ts                     # NextAuth configuration
│   └── supabase.ts                 # Supabase client setup
└── types/
    └── next-auth.d.ts             # NextAuth type definitions
```

## Next Steps

1. Add Supabase database schema for users, projects, and groups
2. Implement role-based dashboards for professors and students
3. Deploy to Vercel or your preferred hosting platform

## License

MIT
