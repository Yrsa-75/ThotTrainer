-- ============================================
-- THOT TRAINER v2.0 — Schéma Supabase
-- Contexte : Chronos Emploi
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
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
-- TABLE : formations
-- ============================================
CREATE TABLE formations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT 'Financée CPF (à configurer)',
  arguments TEXT[] NOT NULL DEFAULT '{}',
  objections TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLE : personas
-- ============================================
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  age INTEGER NOT NULL,
  emoji TEXT NOT NULL DEFAULT '👤',
  profession TEXT NOT NULL,
  situation TEXT NOT NULL,
  personality TEXT NOT NULL,
  motivations TEXT NOT NULL,
  obstacles TEXT NOT NULL,
  style TEXT NOT NULL,
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
  persona_id TEXT NOT NULL,
  formation_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 2 CHECK (level BETWEEN 1 AND 3),
  result session_result NOT NULL DEFAULT 'in_progress',
  performance_score INTEGER CHECK (performance_score BETWEEN 0 AND 100),
  duration_seconds INTEGER,
  analysis_data JSONB,
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
-- INDEX
-- ============================================
CREATE INDEX idx_sessions_vendor ON sessions(vendor_id);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX idx_messages_session ON messages(session_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Sessions
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (vendor_id = auth.uid());
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Admins can view all sessions" ON sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Messages
CREATE POLICY "Users can view messages of own sessions" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.vendor_id = auth.uid())
);
CREATE POLICY "Users can insert messages to own sessions" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.vendor_id = auth.uid())
);
CREATE POLICY "Admins can view all messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Formations & Personas : lecture pour tous
CREATE POLICY "Anyone can read formations" ON formations FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage formations" ON formations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can read personas" ON personas FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage personas" ON personas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can read scoring" ON scoring_rules FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage scoring" ON scoring_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- SEED DATA — Chronos Emploi
-- ============================================

-- Formations
INSERT INTO formations (id, name, description, price, arguments, objections) VALUES
('f1', 'Excel — Maîtrise Professionnelle', 'Formation Excel complète : des bases aux tableaux croisés dynamiques, macros et Power Query. Certification TOSA. 100% en ligne, à votre rythme.', 'Financée CPF (à configurer)', ARRAY['Compétence n°1 demandée par les recruteurs','Certification TOSA reconnue par l''État','100% en ligne, compatible avec la recherche d''emploi','Accompagnement personnalisé par un formateur','Finançable intégralement par le CPF'], ARRAY['Je connais déjà Excel un peu','C''est pas une vraie compétence ça','Je préfère apprendre sur YouTube gratuitement','La certification ça sert à rien','Je sais pas si j''ai assez sur mon CPF']),
('f2', 'Anglais — Certification Professionnelle', 'Formation anglais professionnel adaptée à votre niveau. Préparation au TOEIC ou Linguaskill. Cours en visio avec formateur natif + plateforme e-learning.', 'Financée CPF (à configurer)', ARRAY['L''anglais ouvre 40% d''offres d''emploi en plus','Certification TOEIC/Linguaskill reconnue internationalement','Cours individuels avec formateur natif','Planning flexible adapté à vos disponibilités','Finançable intégralement par le CPF'], ARRAY['J''ai un niveau catastrophique','J''ai déjà essayé Duolingo','J''en ai pas besoin pour mon métier','Les cours en visio c''est pas pareil','Ça va me prendre combien de temps ?']),
('f3', 'Web Marketing — Compétences Digitales', 'Réseaux sociaux, SEO, publicité en ligne, email marketing, analytics. Certification RS. Idéal pour une reconversion dans le digital.', 'Financée CPF (à configurer)', ARRAY['Secteur en forte croissance','Compétences applicables immédiatement','Certification reconnue au Répertoire Spécifique','Projets concrets sur de vraies campagnes','Métier accessible sans diplôme technique'], ARRAY['Le marketing c''est pas un vrai métier','Y''a déjà trop de monde dans le digital','Je suis nul avec les réseaux sociaux','C''est que de la théorie','Ça mène à quoi concrètement ?']),
('f4', 'Intelligence Artificielle — Initiation Pro', 'Comprendre et utiliser l''IA dans un contexte professionnel : ChatGPT, automatisation, prompt engineering, outils IA métier. Certification incluse.', 'Financée CPF (à configurer)', ARRAY['Compétence la plus demandée en 2025-2026','Applicable dans tous les métiers','Avantage concurrentiel énorme','Formation pratique, pas théorique','Les entreprises cherchent des profils IA-ready'], ARRAY['L''IA va remplacer les emplois','C''est trop technique pour moi','C''est une mode','J''ai pas besoin de ça','ChatGPT c''est gratuit, pourquoi payer ?']);

-- Personas
INSERT INTO personas (id, name, subtitle, age, emoji, profession, situation, personality, motivations, obstacles, style) VALUES
('p1', 'Marie', 'La Reconversion Prudente', 42, '👩‍💼', 'Ex-assistante administrative, au chômage depuis 6 mois', 'Licenciée économique après 18 ans dans la même boîte. Inscrite à Pôle Emploi. A été contactée par un setter qui lui a parlé d''un dispositif d''accompagnement. Elle pense venir parler de pistes de postes concrets.', 'Douce, hésitante, a besoin d''être rassurée. Ne prend jamais de décision seule (demande l''avis de son mari). Se sent dépassée par le numérique.', 'Retrouver un emploi stable, se sentir utile, sortir de l''isolement', 'Peur de la technologie, syndrome de l''imposteur, ne comprend pas le CPF, a entendu parler d''arnaques CPF aux infos', 'Polie, pose beaucoup de questions, s''excuse souvent. Dit ah bon ? souvent.'),
('p2', 'Karim', 'Le Pressé Sceptique', 28, '🏍️', 'Ex-livreur Uber Eats, en recherche active', 'A arrêté la livraison, cherche un CDI. Le setter lui a dit qu''il y avait des offres de recruteurs partenaires. Il vient pour voir des offres d''emploi concrètes.', 'Direct, impatient, pragmatique. Va droit au but.', 'Un CDI stable, un salaire fixe, arrêter la précarité', 'Très sceptique sur les formations en ligne, veut des résultats rapides, pas confiance dans les démarches admin, trouve France Identité chelou', 'Réponses courtes, tutoie facilement, brusque. Dit ouais, genre, en vrai, franchement.'),
('p3', 'Françoise', 'La Méfiante Informée', 58, '👓', 'Ancienne comptable, licenciée après un PSE', 'En fin de droits bientôt. Contactée pour un bilan de carrière. Pense que c''est un truc de Pôle Emploi. Très méfiante car elle a lu des articles sur les arnaques CPF.', 'Méfiante, informée, n''aime pas qu''on la prenne pour une idiote. Pose des questions pièges.', 'Retrouver un emploi avant la fin de ses droits, utiliser son CPF intelligemment', 'Convaincue que les formations CPF sont des arnaques, refuse de donner ses identifiants en ligne, ne fait pas confiance à France Identité', 'Vouvoiement strict, peut être cassante, demande des preuves écrites, dit je vais vérifier.'),
('p4', 'Sofiane', 'Le Technicien Ambitieux', 35, '📊', 'Technicien maintenance industrielle, en reconversion', 'A démissionné pour se reconvertir dans le digital. Le setter lui a parlé de matching avec des recruteurs tech. Intéressé mais compare tout.', 'Analytique, rationnel, compare les options. Veut comprendre le processus de A à Z.', 'Se reconvertir dans le numérique, obtenir une certification reconnue', 'A déjà regardé d''autres formations, veut des preuves de résultats, trouve la procédure CPF opaque', 'Questions techniques précises, demande des chiffres. Dit concrètement et en termes de souvent.'),
('p5', 'Amina', 'La Maman Courageuse', 33, '👩‍👧‍👦', 'Ex aide-soignante, en congé parental qui se termine', 'Mère de 3 enfants, ne veut pas reprendre l''aide-soignante. Le setter lui a parlé d''un programme de reconversion.', 'Chaleureuse mais fatiguée et débordée. Culpabilise de prendre du temps pour elle.', 'Un métier compatible avec ses horaires de maman, mieux gagner sa vie', 'Aucun temps libre, peur de l''échec, ne comprend rien au CPF ni à France Identité, son mari est contre', 'Parle souvent de ses enfants, s''interrompt, a besoin qu''on comprenne sa réalité.');

-- Scoring rules
INSERT INTO scoring_rules (positive, negative, phase_bonus, thresholds, start_scores) VALUES (
  '[{"key":"listening","label":"Écoute active et reformulation","points":5},{"key":"personalization","label":"Personnalisation au profil","points":10},{"key":"objection_response","label":"Réponse concrète à objection","points":8},{"key":"empathy","label":"Empathie sincère","points":5},{"key":"open_questions","label":"Questions ouvertes sur besoins","points":5},{"key":"examples","label":"Exemples concrets de résultats","points":7},{"key":"pace","label":"Respect du rythme du prospect","points":3},{"key":"social_proof","label":"Preuve sociale crédible","points":5},{"key":"cpf_guidance","label":"Guidance claire sur la procédure CPF","points":8},{"key":"france_id_reassurance","label":"Rassure sur France Identité / arnaques","points":7},{"key":"needs_identification","label":"Identifie la compétence prioritaire","points":8},{"key":"chronos_presentation","label":"Présente bien Chronos Emploi","points":6}]'::jsonb,
  '[{"key":"ignores","label":"Ignore les objections","points":-10},{"key":"robotic","label":"Script robotique","points":-8},{"key":"pressure","label":"Pression excessive","points":-7},{"key":"no_knowledge","label":"Ne connaît pas la formation / procédure","points":-15},{"key":"condescending","label":"Condescendant","points":-10},{"key":"lies","label":"Mensonge ou exagération","points":-20},{"key":"no_questions","label":"Aucune question posée","points":-8},{"key":"talks_much","label":"Parle plus qu il n écoute","points":-5},{"key":"repeats","label":"Répète les mêmes arguments","points":-7},{"key":"skips_profiling","label":"Saute le profiling","points":-12},{"key":"cant_explain_cpf","label":"Ne sait pas expliquer la procédure CPF","points":-10}]'::jsonb,
  '[{"key":"phase_presentation","label":"A présenté Chronos Emploi","points":5},{"key":"phase_profiling","label":"A échangé sur le profil","points":8},{"key":"phase_recruteurs","label":"A présenté le cahier des charges recruteurs","points":5},{"key":"phase_ateliers","label":"A évoqué les ateliers","points":4},{"key":"phase_formation","label":"A identifié la formation","points":6},{"key":"phase_resume","label":"A fait un résumé","points":4},{"key":"phase_cpf","label":"A guidé sur la connexion CPF","points":8},{"key":"phase_inscription","label":"A expliqué la mise en place","points":5}]'::jsonb,
  '{"level1":30,"level2":55,"level3":80}'::jsonb,
  '{"level1":20,"level2":5,"level3":-15}'::jsonb
);
