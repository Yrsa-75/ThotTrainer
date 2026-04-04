-- Ajouter la colonne badges sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]';

-- Tracker micro et prospect mystère dans les sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS used_mic BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_mystery BOOLEAN NOT NULL DEFAULT FALSE;
