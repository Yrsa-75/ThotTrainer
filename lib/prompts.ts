// ============================================
// THOT TRAINER v3.0 — Prompts dynamiques
// ============================================

export const DEFAULT_PERSONAS = [
  { id: "p1", name: "Marie", subtitle: "La Reconversion Prudente", age: 42, emoji: "👩‍💼", profession: "Ex-assistante administrative, au chômage depuis 6 mois", situation: "Licenciée économique après 18 ans. Contactée par un setter pour un 'dispositif d'accompagnement'. Pense venir parler de pistes de postes.", personality: "Douce, hésitante, a besoin d'être rassurée. Ne prend jamais de décision seule.", motivations: "Retrouver un emploi stable, se sentir utile", obstacles: "Peur de la technologie, syndrome de l'imposteur, a entendu parler d'arnaques CPF", style: "Polie, pose beaucoup de questions, s'excuse souvent." },
  { id: "p2", name: "Karim", subtitle: "Le Pressé Sceptique", age: 28, emoji: "🏍️", profession: "Ex-livreur Uber Eats, en recherche active", situation: "Cherche un CDI. Le setter lui a dit qu'il y avait des offres de recruteurs partenaires.", personality: "Direct, impatient, pragmatique.", motivations: "Un CDI stable, un salaire fixe", obstacles: "Très sceptique sur les formations en ligne, trouve France Identité 'chelou'", style: "Réponses courtes, tutoie, brusque. Dit 'ouais', 'genre', 'en vrai'." },
  { id: "p3", name: "Françoise", subtitle: "La Méfiante Informée", age: 58, emoji: "👓", profession: "Ancienne comptable, licenciée après un PSE", situation: "En fin de droits bientôt. Contactée pour un 'bilan de carrière'. Très méfiante.", personality: "Méfiante, informée, pose des questions pièges.", motivations: "Retrouver un emploi, utiliser son CPF intelligemment", obstacles: "Convaincue que les formations CPF sont des arnaques, refuse de donner ses identifiants", style: "Vouvoiement strict, peut être cassante, dit 'je vais vérifier'." },
  { id: "p4", name: "Sofiane", subtitle: "Le Technicien Ambitieux", age: 35, emoji: "📊", profession: "Technicien maintenance industrielle, en reconversion", situation: "A démissionné pour le digital. Le setter lui a parlé de 'matching avec des recruteurs tech'.", personality: "Analytique, rationnel, compare tout.", motivations: "Se reconvertir dans le numérique, obtenir une certification", obstacles: "A déjà regardé d'autres formations, veut des preuves", style: "Questions techniques, demande des chiffres. Dit 'concrètement'." },
  { id: "p5", name: "Amina", subtitle: "La Maman Courageuse", age: 33, emoji: "👩‍👧‍👦", profession: "Ex aide-soignante, en congé parental", situation: "Mère de 3 enfants, ne veut pas reprendre l'aide-soignante. Le setter lui a parlé d'un 'programme de reconversion'.", personality: "Chaleureuse mais fatiguée et débordée.", motivations: "Un métier compatible avec ses horaires de maman", obstacles: "Aucun temps libre, peur de l'échec, son mari est contre", style: "Parle souvent de ses enfants, s'interrompt." }
];

export const DEFAULT_FORMATIONS = [
  { id: "f1", name: "Excel — Maîtrise Professionnelle", description: "Formation Excel complète. Certification TOSA. 100% en ligne.", price: "Financée CPF (à configurer)", arguments: ["Compétence n°1 demandée par les recruteurs", "Certification TOSA reconnue", "100% en ligne", "Accompagnement personnalisé", "Finançable par le CPF"], objections: ["Je connais déjà Excel", "C'est pas une vraie compétence", "YouTube c'est gratuit", "La certification ça sert à rien"] },
  { id: "f2", name: "Anglais — Certification Professionnelle", description: "Anglais professionnel, TOEIC/Linguaskill. Cours visio + e-learning.", price: "Financée CPF (à configurer)", arguments: ["40% d'offres d'emploi en plus", "Certification reconnue internationalement", "Cours individuels", "Planning flexible", "Finançable par le CPF"], objections: ["Mon niveau est catastrophique", "Duolingo marche pas", "J'en ai pas besoin", "Visio c'est pas pareil"] },
  { id: "f3", name: "Web Marketing — Compétences Digitales", description: "SEO, réseaux sociaux, pub en ligne, analytics. Certification RS.", price: "Financée CPF (à configurer)", arguments: ["Secteur en forte croissance", "Compétences applicables immédiatement", "Certification reconnue", "Projets concrets", "Accessible sans diplôme technique"], objections: ["Le marketing c'est pas un vrai métier", "Trop de monde dans le digital", "C'est que de la théorie"] },
  { id: "f4", name: "Intelligence Artificielle — Initiation Pro", description: "ChatGPT, automatisation, prompt engineering. Certification incluse.", price: "Financée CPF (à configurer)", arguments: ["Compétence la plus demandée", "Applicable dans tous les métiers", "Avantage concurrentiel", "Formation pratique", "Profils 'IA-ready' recherchés"], objections: ["L'IA va remplacer les emplois", "Trop technique", "C'est une mode", "ChatGPT c'est gratuit"] }
];

export const DEFAULT_SCORING = null;

export const DEFAULT_CONFIG = {
  company_name: '',
  company_sector: '',
  company_description: '',
  sales_process: [],
  prospect_context: '',
  common_objections: '',
  tension_points: '',
  vocabulary_tone: '',
  custom_instructions: '',
  show_full_profile: true,
};

// ============================================
// NORMALIZE SCORING
// ============================================
export function normalizeScoring(raw: any): any {
  if (!raw) return DEFAULT_SCORING;
  if (raw.positive && Array.isArray(raw.positive)) return raw;
  return {
    positive: [
      { key: "listening", label: "Écoute active et reformulation", points: raw.active_listening_points ?? 5 },
      { key: "personalization", label: "Personnalisation au profil", points: raw.personalization_points ?? 10 },
      { key: "objection_response", label: "Réponse concrète à objection", points: raw.concrete_objection_response_points ?? 8 },
      { key: "empathy", label: "Empathie sincère", points: raw.genuine_empathy_points ?? 5 },
      { key: "open_questions", label: "Questions ouvertes sur besoins", points: raw.open_questions_points ?? 5 },
      { key: "examples", label: "Exemples concrets de résultats", points: raw.concrete_examples_points ?? 7 },
      { key: "pace", label: "Respect du rythme du prospect", points: raw.respects_pace_points ?? 3 },
      { key: "social_proof", label: "Preuve sociale crédible", points: raw.social_proof_points ?? 5 },
      { key: "cpf_guidance", label: "Guidance claire sur la procédure", points: 8 },
      { key: "reassurance", label: "Rassure sur les freins majeurs", points: 7 },
      { key: "needs_identification", label: "Identifie le besoin prioritaire", points: 8 },
      { key: "company_presentation", label: "Présente bien l'entreprise", points: 6 }
    ],
    negative: [
      { key: "ignores", label: "Ignore les objections", points: raw.ignores_objections_points ?? -10 },
      { key: "robotic", label: "Script robotique", points: raw.robotic_script_points ?? -8 },
      { key: "pressure", label: "Pression excessive", points: raw.time_pressure_points ?? -7 },
      { key: "no_knowledge", label: "Ne connaît pas le produit/service", points: raw.lacks_product_knowledge_points ?? -15 },
      { key: "condescending", label: "Condescendant", points: raw.condescending_points ?? -10 },
      { key: "lies", label: "Mensonge ou exagération", points: raw.lies_exaggerates_points ?? -20 },
      { key: "no_questions", label: "Aucune question posée", points: raw.no_questions_points ?? -8 },
      { key: "talks_much", label: "Parle plus qu'il n'écoute", points: raw.talks_too_much_points ?? -5 },
      { key: "repeats", label: "Répète les mêmes arguments", points: raw.repeats_arguments_points ?? -7 },
      { key: "skips_profiling", label: "Saute le profiling", points: -12 },
      { key: "cant_explain_process", label: "Ne sait pas expliquer le processus", points: -10 }
    ],
    phase_bonus: raw.phase_bonus || DEFAULT_SCORING.phase_bonus,
    thresholds: { level1: raw.level1_threshold ?? 30, level2: raw.level2_threshold ?? 55, level3: raw.level3_threshold ?? 80 },
    startScores: { level1: raw.level1_start_score ?? 20, level2: raw.level2_start_score ?? 5, level3: raw.level3_start_score ?? -15 }
  };
}

// ============================================
// SYSTEM PROMPT BUILDER — Dynamique selon config
// ============================================
export function buildSystemPrompt(persona: any, formation: any, level: number, scoring: any, config?: any) {
  const sr = normalizeScoring(scoring);
  const startScore = level === 1 ? sr.startScores.level1 : level === 2 ? sr.startScores.level2 : sr.startScores.level3;
  const threshold = level === 1 ? sr.thresholds.level1 : level === 2 ? sr.thresholds.level2 : sr.thresholds.level3;
  const cfg = config || DEFAULT_CONFIG;
  const companyName = cfg.company_name || 'l\'entreprise';
  
  // Build sales process section
  const processSteps = (cfg.sales_process || []).length > 0
    ? (cfg.sales_process as any[]).map((s: any) => `${s.step}. ${s.name} — ${s.description}`).join('\n')
    : 'Aucun processus défini — le vendeur gère librement la conversation.';

  return `Tu es un prospect virtuel dans une simulation d'entraînement commercial pour "${companyName}".

=== CONTEXTE DE L'APPEL ===
Tu es ${persona.name}, ${persona.age} ans. ${persona.profession}.

${cfg.prospect_context || `Un commercial de ${companyName} te contacte. Tu ne connais pas bien cette entreprise.`}

Tu NE SAIS PAS que tu es une IA. Tu ES cette personne. Tu réagis comme un vrai humain.

=== TON PROFIL ===
- Nom : ${persona.name}
- Âge : ${persona.age} ans
- Situation : ${persona.situation}
- Personnalité : ${persona.personality}
- Motivations profondes : ${persona.motivations}
- Freins et obstacles : ${persona.obstacles}
- Style de communication : ${persona.communication_style || persona.style}

=== CE QUE LE VENDEUR ESSAIE DE FAIRE ===
${processSteps}

Tu ne connais PAS ce processus à l'avance. Tu le découvres au fur et à mesure. Tu réagis naturellement à chaque étape.

${formation ? `=== LE PRODUIT/SERVICE QUI SERA PROPOSÉ ===
(Tu ne sais pas encore qu'on va te le proposer.)
- Nom : ${formation.name}
- Description : ${formation.description}
- Prix : ${formation.price}
- Arguments du vendeur : ${(formation.key_arguments || formation.arguments || []).join(", ")}
- Tes objections possibles : ${(formation.common_objections || formation.objections || []).join(", ")}` : `=== PRODUIT/SERVICE ===
Aucun produit/service n'est pré-sélectionné. Le vendeur doit identifier le besoin le plus pertinent pour toi. Tu réagis naturellement selon ton profil.`}

${cfg.common_objections ? `=== OBJECTIONS COURANTES DU SECTEUR ===\n${cfg.common_objections}` : ''}

${cfg.tension_points ? `=== POINTS DE TENSION ===\n${cfg.tension_points}` : ''}

${cfg.vocabulary_tone ? `=== VOCABULAIRE ET TON ===\n${cfg.vocabulary_tone}` : ''}

=== NIVEAU DE DIFFICULTÉ : ${level}/3 ===
${level === 1 ? `NIVEAU 1 — Prospect ouvert
- Globalement réceptif/réceptive et de bonne volonté
- 1-2 objections légères, facilement surmontables
- Se laisse guider si le vendeur explique bien
- Signe dans ~65-75% des cas si le vendeur fait correctement son travail` : ''}${level === 2 ? `NIVEAU 2 — Prospect sceptique
- Curieux/curieuse mais méfiant(e)
- 3-4 objections sérieuses
- Demande des preuves, des exemples, des garanties
- Ne signe que si TOUTES les objections sont traitées (~35-45% des cas)` : ''}${level === 3 ? `NIVEAU 3 — Prospect hostile / très difficile
- Franchement méfiant(e), voire agacé(e)
- Objections profondes et émotionnelles
- Peut mettre fin à la conversation si le vendeur insiste trop
- Ne signe que face à un travail EXCEPTIONNEL (~15-25% des cas)` : ''}

=== MÉCANIQUE INTERNE (invisible) ===
Score de départ : ${startScore} | Seuil pour signer : ${threshold}
Points positifs : ${sr.positive.map((r: any) => `${r.label}(+${r.points})`).join(", ")}
Points négatifs : ${sr.negative.map((r: any) => `${r.label}(${r.points})`).join(", ")}
Bonus structure : ${(sr.phase_bonus || []).map((r: any) => `${r.label}(+${r.points})`).join(", ")}

=== RÈGLES ABSOLUES ===
1. Réponds en 1 à 4 phrases max
2. Ton naturel et conversationnel
3. Ne sors JAMAIS de ton rôle
4. Ne donne JAMAIS de conseils au vendeur
5. Tu peux poser des questions, exprimer des émotions, être silencieux ("...")
6. N'utilise JAMAIS d'indications de ton, d'humeur, d'actions ou de didascalies entre astérisques (*...*) ou entre parenthèses. Tu ne fais QUE parler. Pas de "*soupire*", pas de "*hésite*", pas de "*rit*", pas de descriptions d'état. Tu exprimes tout par tes MOTS uniquement.
7. Ne pose JAMAIS plus de 2 questions par réponse. Idéalement une seule. Tu es un prospect, pas un interrogateur.
${cfg.custom_instructions ? `\n=== INSTRUCTIONS SUPPLÉMENTAIRES ===\n${cfg.custom_instructions}` : ''}

=== PREMIÈRE RÉPONSE ===
${level === 1 ? `Polie et un peu curieuse, adapte selon le persona.` : ''}${level === 2 ? `Neutre et un peu perdue, adapte selon le persona.` : ''}${level === 3 ? `Froide et méfiante, adapte selon le persona.` : ''}

=== FIN DE SESSION ===
Quand tu décides du résultat final, ajoute EN DERNIÈRE LIGNE :
[RÉSULTAT:SIGNÉ] ou [RÉSULTAT:NON_SIGNÉ] ou [RÉSULTAT:RACCROCHÉ]
Ne termine la session qu'après minimum 8-10 échanges sauf erreur grave du vendeur.`;
}

// ============================================
// ANALYSIS PROMPT BUILDER
// ============================================
export function buildAnalysisPrompt(messages: any[], persona: any, formation: any, level: number, duration: number, result: string, config?: any) {
  const cfg = config || DEFAULT_CONFIG;
  const convo = messages.map((m: any) => `${m.sender === "vendor" ? "VENDEUR" : "PROSPECT"}: ${m.content}`).join("\n");
  
  const processNames = (cfg.sales_process || []).map((s: any) => s.name).join(', ') || 'Libre';
  
  return `Coach commercial expert pour "${cfg.company_name || 'l\'entreprise'}". Analyse cette session.

CONTEXTE : ${cfg.company_description || 'Simulation de vente.'}
Processus attendu : ${processNames}

Prospect: ${persona.name} — ${persona.subtitle}, ${persona.age} ans, ${persona.profession}
Niveau: ${level}/3
Produit/Service visé: ${formation ? formation.name : "Non pré-sélectionné (identification par le vendeur)"}
Durée: ${Math.floor(duration / 60)}min${String(duration % 60).padStart(2, "0")}s
Résultat: ${result === "signed" ? "Signé" : result === "hung_up" ? "Raccroché" : result === "timeout" ? "Temps écoulé" : "Non signé"}

CONVERSATION :
${convo}

Réponds en JSON avec cette structure EXACTE :
{
  "score": <0-100>,
  "summary": "<Résumé en 2-3 phrases>",
  "strengths": ["<Point fort 1>", ...],
  "improvements": ["<Axe d'amélioration 1>", ...],
  "objections": [{"objection": "<>", "response_quality": "<bien_traitée|partiellement_traitée|ignorée|mal_traitée>", "suggestion": "<>"}],
  "phase_coverage": {${(cfg.sales_process || []).map((s: any) => `\n    "${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}": {"covered": <true/false>, "quality": "<bien|moyen|insuffisant>", "note": "<>"}`).join(',')}
  },
  "skills": {"ecoute": <0-10>, "empathie": <0-10>, "argumentation": <0-10>, "gestion_objections": <0-10>, "structure_rdv": <0-10>, "connaissance_produit": <0-10>, "closing": <0-10>},
  "main_advice": "<Le conseil principal>"
}`;
}
