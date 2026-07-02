-- Migration: сумма заявки для лимитов согласования + новые статусы заявки (S2).
-- Idempotent. Бэкофилл старого статуса pending → pending_approval.

ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS estimated_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Новый дефолт стартового статуса
ALTER TABLE supply_requests ALTER COLUMN status SET DEFAULT 'draft';

-- Бэкофилл: старое 'pending' → 'pending_approval' (остальные значения 1:1)
UPDATE supply_requests SET status = 'pending_approval' WHERE status = 'pending';
