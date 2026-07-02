-- Migration: расторжение аренды — дата расторжения и зачёт депозита.
-- termination_date: дата расторжения в контролируемом флоу (contract_terminations).
-- source_deposit_id: помечает платёж, созданный зачётом депозита (внутренняя
--   переклассификация, не новый приток на счёт). Idempotent — self-heal safe.

ALTER TABLE contract_terminations ADD COLUMN IF NOT EXISTS termination_date date;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS source_deposit_id integer;
