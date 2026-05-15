-- ============================================
-- OrbitPM AI — Production Database Schema
-- Supabase / PostgreSQL
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ORGANIZATIONS (Multi-tenant root)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise', 'airport_suite')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- DEPARTMENTS
-- ============================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#5c7cfa',
  head_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, name)
);

CREATE INDEX idx_departments_org ON departments(org_id);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);

-- Add FK for department head
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  project_code TEXT NOT NULL,           -- e.g., PRDIGI_01
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Not Started' CHECK (status IN ('In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  rag_status TEXT DEFAULT 'green' CHECK (rag_status IN ('green', 'amber', 'red')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget DECIMAL(15, 2),
  budget_spent DECIMAL(15, 2) DEFAULT 0,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_name TEXT,                      -- Denormalized for display
  start_date DATE,
  target_date DATE,
  actual_end_date DATE,
  business_objective TEXT,
  kpi TEXT,
  supporting_team TEXT,
  notes TEXT,
  health_score INTEGER DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  ai_risk_score INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, project_code)
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_dept ON projects(department_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_code ON projects(project_code);

-- ============================================
-- MILESTONES
-- ============================================
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_milestones_project ON milestones(project_id);

-- ============================================
-- RISKS
-- ============================================
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,              -- e.g., RSK-001
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('Data/Technical', 'Vendor/External', 'Data Quality', 'Compliance', 'Governance', 'People/Culture', 'Resource', 'Technical', 'Financial', 'Adoption')),
  impact TEXT DEFAULT 'Medium' CHECK (impact IN ('High', 'Medium', 'Low')),
  likelihood INTEGER DEFAULT 1 CHECK (likelihood >= 1 AND likelihood <= 5),
  risk_score INTEGER GENERATED ALWAYS AS (
    CASE impact WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END * likelihood
  ) STORED,
  severity TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_name TEXT,
  mitigation TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Mitigated', 'Closed', 'Accepted')),
  target_date DATE,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, risk_code)
);

CREATE INDEX idx_risks_org ON risks(org_id);
CREATE INDEX idx_risks_project ON risks(project_id);
CREATE INDEX idx_risks_status ON risks(status);

-- ============================================
-- BLOCKERS
-- ============================================
CREATE TABLE blockers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_blockers_project ON blockers(project_id);

-- ============================================
-- DEPENDENCIES
-- ============================================
CREATE TABLE dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  depends_on_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'required_by', 'related')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (project_id != depends_on_project_id)
);

CREATE INDEX idx_deps_project ON dependencies(project_id);
CREATE INDEX idx_deps_depends ON dependencies(depends_on_project_id);

-- ============================================
-- PROJECT UPDATES (Activity Feed)
-- ============================================
CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  update_type TEXT DEFAULT 'comment' CHECK (update_type IN ('comment', 'status_change', 'progress_update', 'risk_added', 'milestone_update')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_updates_project ON project_updates(project_id);
CREATE INDEX idx_updates_created ON project_updates(created_at DESC);

-- ============================================
-- AI INSIGHTS
-- ============================================
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('health', 'risk', 'delay', 'bottleneck', 'summary', 'recommendation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'success')),
  is_acknowledged BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_insights_org ON ai_insights(org_id);
CREATE INDEX idx_insights_project ON ai_insights(project_id);
CREATE INDEX idx_insights_type ON ai_insights(insight_type);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'success')),
  entity_type TEXT,        -- 'project', 'risk', 'milestone'
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                 -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL,            -- 'project', 'risk', 'milestone', etc.
  entity_id UUID,
  changes JSONB DEFAULT '{}',           -- { field: { old: x, new: y } }
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_org ON audit_logs(org_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================
-- SUBSCRIPTIONS (SaaS Billing)
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  max_users INTEGER DEFAULT 5,
  max_projects INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see data from their own organization
CREATE POLICY "Users see own org" ON organizations
  FOR SELECT USING (id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see own org departments" ON departments
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see own org users" ON users
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see own org projects" ON projects
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see own project milestones" ON milestones
  FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Users see own org risks" ON risks
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users see own org audit" ON audit_logs
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see own org insights" ON ai_insights
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Managers and admins can insert/update
CREATE POLICY "Managers can manage projects" ON projects
  FOR ALL USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Managers can manage risks" ON risks
  FOR ALL USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
