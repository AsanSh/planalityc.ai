CREATE TABLE IF NOT EXISTS "contract_terminations" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "contract_type" text NOT NULL,
  "contract_id" integer NOT NULL,
  "reason" text,
  "basis" text,
  "status" text DEFAULT 'initiated' NOT NULL,
  "financials" jsonb DEFAULT '{}' NOT NULL,
  "note" text,
  "created_by" integer,
  "approved_by" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
