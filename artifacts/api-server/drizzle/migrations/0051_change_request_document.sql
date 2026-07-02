-- Migration: приложенный файл к заявке на изменение (для ПТО)
-- document_meta: JSON { fileName, mimeType, base64 }. Idempotent — self-heal safe.

ALTER TABLE construction_unit_change_requests ADD COLUMN IF NOT EXISTS document_meta TEXT;
