-- Enable pgvector for semantic search
create extension if not exists vector;

-- ── Profiles ──────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile"  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Channels ──────────────────────────────────────────────────────────
create table channels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  icon        text not null default '∑',
  color       text not null default '#2563EB',
  created_at  timestamptz default now()
);
alter table channels enable row level security;
create policy "Users own their channels" on channels for all using (auth.uid() = user_id);

-- ── PDFs ──────────────────────────────────────────────────────────────
create table pdfs (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references channels(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  name          text not null,
  storage_path  text not null,
  size_bytes    bigint not null,
  page_count    int,
  indexed       boolean default false,
  created_at    timestamptz default now()
);
alter table pdfs enable row level security;
create policy "Users own their PDFs" on pdfs for all using (auth.uid() = user_id);

-- ── Chunks (with vector embeddings) ───────────────────────────────────
create table chunks (
  id           uuid primary key default gen_random_uuid(),
  pdf_id       uuid not null references pdfs(id) on delete cascade,
  channel_id   uuid not null references channels(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  content      text not null,
  page_number  int not null,
  embedding    vector(1536),        -- OpenAI text-embedding-3-small dimensions
  created_at   timestamptz default now()
);
alter table chunks enable row level security;
create policy "Users own their chunks" on chunks for all using (auth.uid() = user_id);

-- Vector similarity search function
create or replace function match_chunks(
  query_embedding vector(1536),
  match_channel_id uuid,
  match_user_id uuid,
  match_count int default 6
)
returns table (
  id uuid, pdf_id uuid, content text, page_number int,
  pdf_name text, similarity float
)
language plpgsql as $$
begin
  return query
  select
    c.id, c.pdf_id, c.content, c.page_number,
    p.name as pdf_name,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join pdfs p on p.id = c.pdf_id
  where c.channel_id = match_channel_id
    and c.user_id = match_user_id
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ── Messages ──────────────────────────────────────────────────────────
create table messages (
  id              uuid primary key default gen_random_uuid(),
  channel_id      uuid not null references channels(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  source_pdf_name text,
  source_page     int,
  web_used        boolean default false,
  created_at      timestamptz default now()
);
alter table messages enable row level security;
create policy "Users own their messages" on messages for all using (auth.uid() = user_id);

-- ── Storage buckets ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false);
create policy "Users can upload their own PDFs"
  on storage.objects for insert
  with check (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can read their own PDFs"
  on storage.objects for select
  using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete their own PDFs"
  on storage.objects for delete
  using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
