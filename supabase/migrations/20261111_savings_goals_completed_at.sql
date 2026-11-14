-- Additive: mark a savings goal as completed (null = still active).
alter table public.savings_goals add column if not exists completed_at timestamptz;
