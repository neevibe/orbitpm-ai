-- ============================================
-- OrbitPM AI — Seed Data (BIAL Commercial Dept)
-- Run after initial schema migration
-- ============================================

-- Create Xyrenis organization
INSERT INTO organizations (id, name, slug, plan) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Xyrenis Commercial Department', 'xyrenis-commercial', 'enterprise');

-- Create departments
INSERT INTO departments (id, org_id, name, color) VALUES
  ('d0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Digital & Data', '#5c7cfa'),
  ('d0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Operations', '#f59e0b'),
  ('d0000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Commercial Development', '#10b981'),
  ('d0000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Advertising & Marketing', '#8b5cf6'),
  ('d0000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Retail & Commerce', '#f97316'),
  ('d0000006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Amenities & Hospitality', '#ec4899'),
  ('d0000007-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Strategic Support', '#06b6d4');

-- Sample projects (Digital & Data)
INSERT INTO projects (org_id, department_id, project_code, name, status, priority, progress, owner_name, start_date, target_date, business_objective, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', 'PRDIGI_01', 'DBS Bank Integration for rewards points conversion', 'In Progress', 'High', 0, 'Musthaq Ahamed', '2025-01-01', '2026-12-31', 'Integrate with DBS bank for points conversion', NULL),
  ('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', 'PRDIGI_02', 'ITC Hotels Integration for rewards points conversion', 'In Progress', 'High', 0, 'Musthaq Ahamed', '2026-05-01', '2026-12-31', 'Integrate with ITC hotels on rewards points', NULL),
  ('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', 'PRDIGI_03', 'Payment Gateway Enhancement', 'In Progress', 'Critical', 0, 'Musthaq Ahamed', '2026-05-01', '2026-09-30', 'Seamless payment experience', 'Pilot with new device at DutyFree on 15th May'),
  ('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', 'PRDIGI_06', 'CRM for Pulse Rewards Members', 'In Progress', 'Critical', 0, 'Musthaq Ahamed', '2026-04-01', '2026-06-01', 'Build CRM strategies for customer experience', 'Proposal ready for leadership'),
  ('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', 'PRDIGI_08', 'Duty Free Click and Collect', 'In Progress', 'Critical', 0, 'Ajay Rao', '2026-04-01', NULL, 'Duty Free sales target ₹8.3Cr', 'Progress closely monitored'),
  ('11111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', 'PRDIGI_14', 'AI Chatbot for Airport Navigation', 'In Progress', 'Critical', 35, 'Musthaq Ahamed', '2026-04-01', '2026-09-30', NULL, 'LLM hallucination risk; need fallback routing');

-- Sample projects (Operations)
INSERT INTO projects (org_id, department_id, project_code, name, status, priority, progress, owner_name, start_date, target_date, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'd0000002-0000-0000-0000-000000000002', 'PROPR_01', 'BIAL Academy relaunch', 'In Progress', 'High', 0, 'Javeed/Rohan', '2025-01-01', '2027-03-31', 'RFQ rolled out, go live 11th May'),
  ('11111111-1111-1111-1111-111111111111', 'd0000002-0000-0000-0000-000000000002', 'PROPR_02', 'Phase wise launch of Parking guidance system on Pulse', 'Delayed', 'High', 0, 'Kiran', '2026-05-01', '2026-12-31', NULL),
  ('11111111-1111-1111-1111-111111111111', 'd0000002-0000-0000-0000-000000000002', 'PROPR_03', 'ISO final certification process', 'In Progress', 'Critical', 0, 'Rohan', NULL, '2026-09-30', NULL),
  ('11111111-1111-1111-1111-111111111111', 'd0000002-0000-0000-0000-000000000002', 'PROPR_06', 'BLR Priority access', 'In Progress', 'Critical', 0, 'Dominic/George Fanthome', '2026-04-01', '2026-06-01', NULL);

-- Sample risks
INSERT INTO risks (org_id, project_id, risk_code, description, category, impact, likelihood, owner_name, mitigation, status, target_date)
SELECT
  '11111111-1111-1111-1111-111111111111',
  p.id,
  'RSK-001',
  'Data integration API stability concerns',
  'Data/Technical',
  'High',
  2,
  'Musthaq',
  'Implement retry logic and fallback mechanisms',
  'Open',
  '2026-04-30'
FROM projects p WHERE p.project_code = 'PRDIGI_01';

-- Note: Additional seed data should be inserted via the app's import feature
-- or by extending this file with all 142 projects from the Excel
