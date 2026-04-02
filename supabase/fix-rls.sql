-- ============================================
-- FIX RLS — Permissions propres
-- ============================================

-- Supprimer les anciennes policies (ignore les erreurs si elles n'existent pas)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view messages of own sessions" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own sessions" ON messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;

-- ============================================
-- PROFILES : tout le monde peut voir les noms (leaderboard), admin voit tout
-- ============================================
CREATE POLICY "All authenticated can read profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SESSIONS : vendeur voit les siennes, admin voit tout
-- ============================================
CREATE POLICY "Vendors view own sessions"
  ON sessions FOR SELECT
  USING (vendor_id = auth.uid());

CREATE POLICY "Admins view all sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Vendors insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Admins insert sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================
-- MESSAGES : via la session
-- ============================================
CREATE POLICY "View messages via session"
  ON messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.vendor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Insert messages via session"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.vendor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
