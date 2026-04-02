-- ============================================
-- THOT TRAINER v3.0 — Platform Config
-- Contexte global éditable + BYOK
-- ============================================

-- Table de configuration globale (1 seule ligne par plateforme)
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identité entreprise
  company_name TEXT NOT NULL DEFAULT 'Mon Entreprise',
  company_sector TEXT NOT NULL DEFAULT '',
  company_description TEXT NOT NULL DEFAULT '',
  
  -- Processus de vente (étapes du RDV)
  sales_process JSONB NOT NULL DEFAULT '[]',
  
  -- Contexte prospect
  prospect_context TEXT NOT NULL DEFAULT '',
  
  -- Objections et points de tension
  common_objections TEXT NOT NULL DEFAULT '',
  tension_points TEXT NOT NULL DEFAULT '',
  
  -- Vocabulaire et ton
  vocabulary_tone TEXT NOT NULL DEFAULT '',
  
  -- Instructions custom libres
  custom_instructions TEXT NOT NULL DEFAULT '',
  
  -- Options d'affichage
  show_full_profile BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Clés API client (BYOK)
  client_anthropic_key TEXT NOT NULL DEFAULT '',
  client_openai_key TEXT NOT NULL DEFAULT '',
  
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read config" ON platform_config FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage config" ON platform_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Insérer la config par défaut (contexte Chronos Emploi)
INSERT INTO platform_config (
  company_name, company_sector, company_description,
  sales_process, prospect_context, common_objections,
  tension_points, vocabulary_tone, custom_instructions,
  show_full_profile
) VALUES (
  'Chronos Emploi',
  'Formation professionnelle / CPF',
  'Chronos Emploi est une société spécialisée dans l''accompagnement au retour à l''emploi et la reconversion professionnelle. Elle propose des formations financées par le CPF (Compte Personnel de Formation) dans 4 domaines : Excel, Anglais, Web Marketing et Intelligence Artificielle.',
  '[
    {"step": 1, "name": "Présentation", "description": "Se présenter et présenter Chronos Emploi comme un dispositif d''aide au retour à l''emploi ou de reconversion professionnelle"},
    {"step": 2, "name": "Profiling", "description": "Échanger avec le prospect sur son parcours, cibler ses forces/faiblesses et ses attentes professionnelles"},
    {"step": 3, "name": "Cahier des charges recruteurs", "description": "Présenter le cahier des charges des recruteurs partenaires et les compétences recherchées"},
    {"step": 4, "name": "Ateliers", "description": "Proposer les ateliers : CV, coaching en entretien d''embauche, négociation salariale, profil LinkedIn"},
    {"step": 5, "name": "Identification formation", "description": "Identifier la compétence la plus importante pour le prospect parmi les formations proposées (Excel, Anglais, Web Marketing, IA)"},
    {"step": 6, "name": "Résumé", "description": "Faire un résumé de la situation du prospect et du plan d''action proposé"},
    {"step": 7, "name": "Connexion CPF", "description": "Guider le prospect pour se connecter à son compte CPF via France Identité ou l''Identité Numérique"},
    {"step": 8, "name": "Inscription", "description": "Expliquer la mise en place : dates d''entrée/sortie de formation, demande de devis, reste à charge, confirmation d''inscription"}
  ]'::jsonb,
  'Le prospect a été contacté par un setter (téléprospecteur) qui lui a pris un rendez-vous. Le setter a parlé vaguement d''un "dispositif d''aide au retour à l''emploi", d''un "bilan de carrière" ou de "recruteurs partenaires". Le prospect NE CONNAIT PAS Chronos Emploi, ne sait pas vraiment pourquoi il est là, et confond probablement avec un cabinet de recrutement qui va lui proposer des offres d''emploi. Il ne sait PAS qu''on va lui parler de formation.',
  'Les prospects ont souvent entendu parler d''arnaques CPF aux infos. Ils sont méfiants quand on parle de formation en ligne. Beaucoup confondent Chronos avec Pôle Emploi ou un cabinet de recrutement. Les objections classiques : "c''est une arnaque", "j''ai pas le temps", "je vais réfléchir", "je dois en parler à mon mari/ma femme", "les formations en ligne c''est pas sérieux", "je suis trop vieux pour apprendre".',
  'La connexion au compte CPF via France Identité est un moment de forte tension. Le prospect a peur de donner ses informations personnelles en ligne, trouve la procédure compliquée, et craint de se faire arnaquer. Le vendeur doit rassurer, expliquer la sécurité du dispositif, et guider pas à pas. L''examen de certification est aussi un point de stress pour les prospects.',
  'Ton conversationnel et naturel. Tutoiement ou vouvoiement selon le persona. Les prospects utilisent souvent des expressions familières : "euh", "bah", "enfin", "du coup", "en vrai", "genre". Le vocabulaire CPF (reste à charge, France Identité, TOSA, TOEIC, certification) doit être expliqué simplement car les prospects ne le connaissent pas.',
  'Le mot "formation" ne doit apparaître dans les réponses du prospect que quand le vendeur l''introduit. Le prospect ne connaît PAS les étapes du processus de vente, il les découvre au fur et à mesure. Ne jamais terminer la session avant minimum 8-10 échanges sauf erreur grave du vendeur.',
  TRUE
);
