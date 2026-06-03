CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  nickname text UNIQUE,
  password_hash text,
  role text NOT NULL DEFAULT 'user',
  name text NOT NULL DEFAULT 'Local User',
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS nickname text UNIQUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_users_role_check'
  ) THEN
    ALTER TABLE app_users
      ADD CONSTRAINT app_users_role_check CHECK (role IN ('user', 'coach', 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  gender text,
  age numeric,
  weight numeric,
  target_weight numeric,
  height numeric,
  activity_level text,
  goal text,
  daily_calories numeric,
  daily_proteins numeric,
  daily_fats numeric,
  daily_carbs numeric,
  daily_water_ml numeric,
  ai_personality text,
  quick_presets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_weight numeric;

CREATE TABLE IF NOT EXISTS food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  meal_type text,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_calories numeric,
  total_proteins numeric,
  total_fats numeric,
  total_carbs numeric,
  date date NOT NULL,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  amount_ml numeric NOT NULL,
  date date NOT NULL,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  weight numeric NOT NULL,
  date date NOT NULL,
  note text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  date date NOT NULL,
  waist numeric,
  hips numeric,
  chest numeric,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  emoji text,
  unlocked_date date,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Weekly plan',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_day_index numeric NOT NULL DEFAULT 0,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  max_uses numeric NOT NULL DEFAULT 20,
  used_count numeric NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coach_invites_status_check'
  ) THEN
    ALTER TABLE coach_invites
      ADD CONSTRAINT coach_invites_status_check CHECK (status IN ('active', 'revoked'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coach_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  permissions jsonb NOT NULL DEFAULT '{"nutrition": true, "water": true, "weight": true, "plan": true, "history": true, "notes": true}'::jsonb,
  connected_date timestamptz NOT NULL DEFAULT now(),
  disconnected_date timestamptz,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_user_id, client_user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coach_clients_status_check'
  ) THEN
    ALTER TABLE coach_clients
      ADD CONSTRAINT coach_clients_status_check CHECK (status IN ('active', 'disconnected'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user_type ON achievements(user_id, type);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_updated ON meal_plans(user_id, updated_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_invites_coach_status ON coach_invites(coach_user_id, status, created_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_clients_coach_status ON coach_clients(coach_user_id, status, updated_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_clients_client_status ON coach_clients(client_user_id, status, updated_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_notes_pair_created ON coach_notes(coach_user_id, client_user_id, created_date DESC);

INSERT INTO app_users (email, nickname, name)
VALUES ('local@nutriai.app', 'localuser', 'Local User')
ON CONFLICT (email) DO NOTHING;
