-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste → Run)

alter table public.products
  add column if not exists item_code text,
  add column if not exists is_no_return boolean not null default false;

-- Optional: make item codes fast to search/lookup
create index if not exists products_item_code_idx on public.products (item_code);
