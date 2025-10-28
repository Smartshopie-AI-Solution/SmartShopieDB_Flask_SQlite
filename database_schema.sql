-- SmartShopie AI Client Analytics Dashboard Database Schema
-- This database stores all data displayed across the dashboard tabs
-- Created: 2024

-- ============================================================
-- OVERVIEW TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS overview_kpis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    total_customers INTEGER,
    total_customers_change REAL,
    conversion_rate REAL,
    conversion_rate_change REAL,
    ai_interactions INTEGER,
    ai_interactions_change REAL,
    revenue_impact REAL,
    revenue_impact_change REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversion_funnel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    stage_name TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    count INTEGER NOT NULL,
    percentage REAL,
    dropoff_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interaction_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    interaction_name TEXT NOT NULL,
    count INTEGER NOT NULL,
    percentage REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CONVERSIONS TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS conversion_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    overall_conversion_rate REAL NOT NULL,
    conversion_rate_change REAL,
    ai_driven_conversions REAL,
    ai_driven_percentage REAL,
    cart_recovery_rate REAL,
    cart_recovery_via_ai REAL,
    avg_time_to_convert REAL,
    avg_time_change REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversion_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    period_type TEXT, -- 'daily', 'weekly', 'monthly'
    conversions INTEGER,
    ai_attributed_conversions INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CUSTOMER INTELLIGENCE TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    segment_name TEXT NOT NULL,
    segment_size INTEGER NOT NULL,
    percentage REAL,
    avg_lifetime_value REAL,
    avg_order_value REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS behavioral_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    pattern_type TEXT NOT NULL, -- 'peak_activity', 'preference_match', 'return_rate'
    pattern_name TEXT NOT NULL,
    value REAL NOT NULL,
    metric_unit TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_concerns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    concern_name TEXT NOT NULL,
    concern_category TEXT NOT NULL, -- 'skincare', 'haircare'
    query_count INTEGER,
    ai_success_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_lifetime_value (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    segment_name TEXT NOT NULL,
    predicted_clv REAL NOT NULL,
    current_clv REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_gaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    gap_rank INTEGER,
    product_name TEXT NOT NULL,
    category TEXT,
    demand_score REAL,
    potential_revenue REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PRODUCT ANALYTICS TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS product_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    views INTEGER,
    ai_recommendations INTEGER,
    purchases INTEGER,
    revenue REAL,
    conversion_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    category_name TEXT NOT NULL,
    total_products INTEGER,
    total_views INTEGER,
    total_revenue REAL,
    avg_conversion_rate REAL,
    ai_recommendation_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AI PERFORMANCE TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_model_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    model_name TEXT NOT NULL,
    accuracy REAL NOT NULL,
    precision REAL,
    recall REAL,
    f1_score REAL,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_feature_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    feature_name TEXT NOT NULL, -- 'Chat', 'Questionnaire', 'Image Analysis', 'Routine Planner'
    usage_count INTEGER,
    success_rate REAL,
    user_satisfaction REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INTERACTIONS TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id TEXT NOT NULL,
    interaction_date TIMESTAMP NOT NULL,
    interaction_type TEXT NOT NULL,
    customer_id TEXT,
    session_id TEXT,
    response_time_sec REAL,
    satisfaction_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interaction_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    total_interactions INTEGER,
    chat_interactions INTEGER,
    questionnaire_interactions INTEGER,
    image_analysis_interactions INTEGER,
    routine_planner_interactions INTEGER,
    avg_response_time REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REVENUE IMPACT TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS revenue_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    total_revenue_impact REAL NOT NULL,
    avg_order_value REAL,
    avg_order_value_with_ai REAL,
    avg_order_value_improvement REAL,
    monthly_investment REAL,
    monthly_return REAL,
    roi_percentage REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_attribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    ai_feature TEXT NOT NULL,
    revenue_amount REAL NOT NULL,
    percentage REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    category_name TEXT NOT NULL,
    revenue_amount REAL NOT NULL,
    percentage REAL,
    ai_attributed_revenue REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_value_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    tier_name TEXT NOT NULL, -- 'High', 'Medium', 'Low'
    customer_count INTEGER,
    avg_revenue REAL,
    total_revenue REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_forecasting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_revenue REAL,
    confidence_level REAL,
    upper_bound REAL,
    lower_bound REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REAL-TIME MONITOR TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS system_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date TIMESTAMP NOT NULL,
    system_component TEXT NOT NULL, -- 'API', 'Database', 'AI Models', 'Frontend'
    status TEXT NOT NULL, -- 'healthy', 'warning', 'critical'
    cpu_usage REAL,
    memory_usage REAL,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_name TEXT NOT NULL,
    method TEXT NOT NULL,
    request_count INTEGER,
    avg_response_time_ms REAL,
    error_rate REAL,
    last_checked TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BILLING & USAGE TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    plan_name TEXT NOT NULL,
    base_cost REAL NOT NULL,
    usage_cost REAL,
    total_cost REAL NOT NULL,
    api_calls INTEGER,
    data_processed_gb REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_breakdown (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    service_name TEXT NOT NULL,
    usage_count INTEGER,
    cost REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- API CONFIGURATION TAB DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS api_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_type TEXT NOT NULL, -- 'customers', 'products', 'orders', 'analytics', 'webhooks'
    api_name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT,
    status TEXT DEFAULT 'active',
    last_sync TIMESTAMP,
    sync_frequency TEXT, -- 'real-time', 'hourly', 'daily'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_overview_kpis_date ON overview_kpis(record_date);
CREATE INDEX IF NOT EXISTS idx_conversion_funnel_date ON conversion_funnel(record_date);
CREATE INDEX IF NOT EXISTS idx_interaction_types_date ON interaction_types(record_date);
CREATE INDEX IF NOT EXISTS idx_conversion_analytics_date ON conversion_analytics(record_date);
CREATE INDEX IF NOT EXISTS idx_customer_segments_date ON customer_segments(record_date);
CREATE INDEX IF NOT EXISTS idx_product_analytics_date ON product_analytics(record_date);
CREATE INDEX IF NOT EXISTS idx_revenue_summary_date ON revenue_summary(record_date);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_date ON revenue_attribution(record_date);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_date ON customer_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_system_health_date ON system_health(record_date);
CREATE INDEX IF NOT EXISTS idx_billing_summary_period ON billing_summary(billing_period_start, billing_period_end);


