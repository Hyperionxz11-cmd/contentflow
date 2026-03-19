-- ============================================
-- ContentFlow - Database Schema
-- ============================================
-- Execute this in Supabase SQL Editor or via MCP

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  plan text default 'free' check (plan in ('free', 'premium')),
  stripe_customer_id text,
  stripe_subscription_id text,
  linkedin_connected boolean default false,
  linkedin_user_id text,
  linkedin_access_token text,
  linkedin_token_expires_at timestamptz,
  linkedin_name text,
  linkedin_picture_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Posts table
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  scheduled_at timestamptz not null,
  status text default 'scheduled' check (status in ('draft', 'scheduled', 'published', 'failed')),
  published_at timestamptz,
  linkedin_post_id text,
  error_message text,
  template_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Row Level Security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Posts policies
create policy "Users can view own posts"
  on public.posts for select using (auth.uid() = user_id);
create policy "Users can insert own posts"
  on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- 4. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Indexes for performance
create index idx_posts_user_id on public.posts(user_id);
create index idx_posts_status on public.posts(status);
create index idx_posts_scheduled_at on public.posts(scheduled_at);
create index idx_posts_scheduled_pending on public.posts(scheduled_at) where status = 'scheduled';
