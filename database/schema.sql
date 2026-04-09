-- ThidaAI Platform Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(10),
    occupation VARCHAR(255),
    monthly_income NUMERIC(15, 2),
    marital_status VARCHAR(50),
    dependents INTEGER DEFAULT 0,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(100) NOT NULL, -- life, health, investment, rider
    premium_amount NUMERIC(15, 2) NOT NULL,
    sum_assured NUMERIC(15, 2),
    premium_frequency VARCHAR(50) DEFAULT 'monthly', -- monthly, quarterly, annually
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, lapsed, surrendered, matured, claimed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    proposal_data JSONB NOT NULL DEFAULT '{}',
    pdf_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Needs analysis results
CREATE TABLE IF NOT EXISTS needs_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL DEFAULT '{}',
    ai_recommendations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MDRT tracking
CREATE TABLE IF NOT EXISTS mdrt_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    target_premium NUMERIC(15, 2) NOT NULL,
    achieved_premium NUMERIC(15, 2) DEFAULT 0,
    target_cases INTEGER NOT NULL DEFAULT 0,
    achieved_cases INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial planning records
CREATE TABLE IF NOT EXISTS financial_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL, -- retirement, education, tax
    input_data JSONB NOT NULL DEFAULT '{}',
    result_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp conversations
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    message_body TEXT NOT NULL,
    message_sid VARCHAR(255),
    client_id UUID REFERENCES clients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_needs_analyses_client_id ON needs_analyses(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_plans_client_id ON financial_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_mdrt_progress_year ON mdrt_progress(year);
