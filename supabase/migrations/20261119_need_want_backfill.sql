-- Need/Want backfill by category (applied as "need_want_backfill").
-- Old values are kept in need_want_backup_20261119 so this can be undone:
--   update public.transactions t set need_want=b.old_need_want from public.need_want_backup_20261119 b where b.transaction_id=t.id;
create table if not exists public.need_want_backup_20261119 (transaction_id uuid primary key, old_need_want text, backed_up_at timestamptz not null default now());
alter table public.need_want_backup_20261119 enable row level security;
