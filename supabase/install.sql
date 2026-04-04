-- ============================================
-- THOT TRAINER — Installation complète
-- Un seul fichier, un seul copier-coller
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TYPES
-- ============================================
CREATE TYPE user_role AS ENUM ('vendor', 'admin');
CREATE TYPE session_result AS ENUM ('signed', 'not_signed', 'hung_up', 'timeout', 'in_progress');
CREATE TYPE message_sender AS ENUM ('vendor', 'prospect');

-- ============================================
-- TABLE : profiles
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'vendor',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE : formations (produits/services)
-- ============================================
CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT 'À configurer',
  key_arguments TEXT[] NOT NULL DEFAULT '{}',
  common_objections TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE : personas (prospects virtuels)
-- ============================================
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  age INTEGER NOT NULL DEFAULT 30,
  emoji TEXT NOT NULL DEFAULT '👤',
  profession TEXT NOT NULL DEFAULT '',
  situation TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL DEFAULT '',
  motivations TEXT NOT NULL DEFAULT '',
  obstacles TEXT NOT NULL DEFAULT '',
  communication_style TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE : scoring_rules
-- ============================================
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  positive JSONB NOT NULL DEFAULT '[]',
  negative JSONB NOT NULL DEFAULT '[]',
  phase_bonus JSONB NOT NULL DEFAULT '[]',
  thresholds JSONB NOT NULL DEFAULT '{"level1":30,"level2":55,"level3":80}',
  start_scores JSONB NOT NULL DEFAULT '{"level1":20,"level2":5,"level3":-15}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE : sessions
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL,
  formation_id UUID,
  difficulty_level INTEGER NOT NULL DEFAULT 2 CHECK (difficulty_level >= 1 AND difficulty_level <= 3),
  result session_result NOT NULL DEFAULT 'in_progress',
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  duration_limit_seconds INTEGER NOT NULL DEFAULT 1200,
  actual_duration_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  analysis_summary TEXT,
  analysis_strengths JSONB,
  analysis_improvements JSONB,
  analysis_objections JSONB,
  analysis_skills JSONB,
  analysis_main_advice TEXT,
  analysis_next_recommendation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE : messages
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender message_sender NOT NULL,
  content TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE : platform_config
-- ============================================
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'Mon Entreprise',
  company_sector TEXT NOT NULL DEFAULT '',
  company_description TEXT NOT NULL DEFAULT '',
  sales_process JSONB NOT NULL DEFAULT '[]',
  prospect_context TEXT NOT NULL DEFAULT '',
  common_objections TEXT NOT NULL DEFAULT '',
  tension_points TEXT NOT NULL DEFAULT '',
  vocabulary_tone TEXT NOT NULL DEFAULT '',
  custom_instructions TEXT NOT NULL DEFAULT '',
  show_full_profile BOOLEAN NOT NULL DEFAULT TRUE,
  client_anthropic_key TEXT NOT NULL DEFAULT '',
  client_openai_key TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEX
-- ============================================
CREATE INDEX idx_sessions_vendor ON sessions(vendor_id);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX idx_messages_session ON messages(session_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Profiles : tout le monde lit, chacun modifie le sien
CREATE POLICY "All authenticated can read profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Service role can manage profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- Sessions : vendeur voit les siennes, admin voit tout
CREATE POLICY "Vendors view own sessions" ON sessions FOR SELECT USING (vendor_id = auth.uid());
CREATE POLICY "Admins view all sessions" ON sessions FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Vendors insert own sessions" ON sessions FOR INSERT WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Admins insert sessions" ON sessions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Messages : tout utilisateur connecté peut insérer et lire via session
CREATE POLICY "Authenticated users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "View messages via session" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.vendor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Formations & Personas : lecture pour tous, admin gère
CREATE POLICY "Anyone can read formations" ON formations FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage formations" ON formations FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can read personas" ON personas FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage personas" ON personas FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Scoring & Config : lecture pour tous, admin gère
CREATE POLICY "Anyone can read scoring" ON scoring_rules FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage scoring" ON scoring_rules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can read config" ON platform_config FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage config" ON platform_config FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- ============================================
-- DONNÉES PAR DÉFAUT
-- ============================================

-- Config vierge (le client la remplira via l'admin ou la génération IA)
INSERT INTO platform_config (company_name, company_description, show_full_profile) 
VALUES ('Mon Entreprise', 'Configurez votre entreprise dans Administration → Paramétrage', TRUE);

-- Scoring par défaut
INSERT INTO scoring_rules (positive, negative, phase_bonus) VALUES (
  '[{"key":"listening","label":"Écoute active et reformulation","points":5},{"key":"personalization","label":"Personnalisation au profil","points":10},{"key":"objection_response","label":"Réponse concrète à objection","points":8},{"key":"empathy","label":"Empathie sincère","points":5},{"key":"open_questions","label":"Questions ouvertes sur besoins","points":5},{"key":"examples","label":"Exemples concrets de résultats","points":7},{"key":"pace","label":"Respect du rythme du prospect","points":3},{"key":"social_proof","label":"Preuve sociale crédible","points":5},{"key":"reassurance","label":"Rassure sur les freins majeurs","points":7},{"key":"needs_identification","label":"Identifie le besoin prioritaire","points":8},{"key":"company_presentation","label":"Présente bien l''entreprise","points":6}]'::jsonb,
  '[{"key":"ignores","label":"Ignore les objections","points":-10},{"key":"robotic","label":"Script robotique","points":-8},{"key":"pressure","label":"Pression excessive","points":-7},{"key":"no_knowledge","label":"Ne connaît pas le produit/service","points":-15},{"key":"condescending","label":"Condescendant","points":-10},{"key":"lies","label":"Mensonge ou exagération","points":-20},{"key":"no_questions","label":"Aucune question posée","points":-8},{"key":"talks_much","label":"Parle plus qu il n écoute","points":-5},{"key":"repeats","label":"Répète les mêmes arguments","points":-7},{"key":"skips_profiling","label":"Saute le profiling","points":-12},{"key":"cant_explain_process","label":"Ne sait pas expliquer le processus","points":-10}]'::jsonb,
  '[{"key":"phase_presentation","label":"A présenté l''entreprise et le dispositif","points":5},{"key":"phase_profiling","label":"A échangé sur le profil et les attentes","points":8},{"key":"phase_needs","label":"A identifié les besoins","points":6},{"key":"phase_solution","label":"A présenté la solution adaptée","points":6},{"key":"phase_objections","label":"A traité les objections","points":5},{"key":"phase_closing","label":"A fait le closing / résumé","points":5}]'::jsonb
);

-- ============================================
-- TERMINÉ ! 
-- Prochaine étape : créer un compte admin
-- 1. Supabase → Authentication → Users → Add User
-- 2. Puis exécuter :
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES ('COLLE_LE_USER_ID', 'email@client.com', 'Nom Admin', 'admin');
-- ============================================
