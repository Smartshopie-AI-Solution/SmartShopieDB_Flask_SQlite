-- SmartShopie AI Client Analytics Dashboard Database Schema with Indexes
-- ================================================================

-- Schema for table: overview_kpis
CREATE TABLE overview_kpis (
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
CREATE INDEX idx_overview_kpis_record_date ON overview_kpis(record_date);

-- Schema for table: conversion_funnel
CREATE TABLE conversion_funnel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    stage_name TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    count INTEGER NOT NULL,
    percentage REAL,
    dropoff_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_conversion_funnel_record_date ON conversion_funnel(record_date);
CREATE INDEX idx_conversion_funnel_stage_name ON conversion_funnel(stage_name);

-- Schema for table: interaction_types
CREATE TABLE interaction_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    interaction_name TEXT NOT NULL,
    count INTEGER NOT NULL,
    percentage REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_interaction_types_record_date ON interaction_types(record_date);

-- Schema for table: conversion_analytics
CREATE TABLE conversion_analytics (
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
CREATE INDEX idx_conversion_analytics_record_date ON conversion_analytics(record_date);

-- Schema for table: conversion_trends
CREATE TABLE conversion_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    period_type TEXT,
    conversions INTEGER,
    ai_attributed_conversions INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_conversion_trends_record_date ON conversion_trends(record_date);

-- Schema for table: customer_segments
CREATE TABLE customer_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    segment_name TEXT NOT NULL,
    segment_size INTEGER NOT NULL,
    percentage REAL,
    avg_lifetime_value REAL,
    avg_order_value REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_segments_segment_name ON customer_segments(segment_name);

-- Schema for table: behavioral_patterns
CREATE TABLE behavioral_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_name TEXT NOT NULL,
    value REAL NOT NULL,
    metric_unit TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_behavioral_patterns_type ON behavioral_patterns(pattern_type);

-- Schema for table: customer_concerns
CREATE TABLE customer_concerns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    concern_name TEXT NOT NULL,
    concern_category TEXT NOT NULL,
    query_count INTEGER,
    ai_success_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_concerns_category ON customer_concerns(concern_category);

-- Schema for table: customer_lifetime_value
CREATE TABLE customer_lifetime_value (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    segment_name TEXT NOT NULL,
    predicted_clv REAL NOT NULL,
    current_clv REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_ltv_segment ON customer_lifetime_value(segment_name);

-- Schema for table: product_gaps
CREATE TABLE product_gaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    gap_rank INTEGER,
    product_name TEXT NOT NULL,
    category TEXT,
    demand_score REAL,
    potential_revenue REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_product_gaps_category ON product_gaps(category);

-- Schema for table: product_analytics
CREATE TABLE product_analytics (
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
CREATE INDEX idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX idx_product_analytics_category ON product_analytics(category);

-- Schema for table: category_performance
CREATE TABLE category_performance (
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
CREATE INDEX idx_category_performance_category ON category_performance(category_name);

-- Schema for table: ai_model_performance
CREATE TABLE ai_model_performance (
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
CREATE INDEX idx_ai_model_performance_model_name ON ai_model_performance(model_name);

-- Schema for table: ai_feature_performance
CREATE TABLE ai_feature_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    feature_name TEXT NOT NULL,
    usage_count INTEGER,
    success_rate REAL,
    user_satisfaction REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ai_feature_feature_name ON ai_feature_performance(feature_name);

-- Schema for table: customer_interactions
CREATE TABLE customer_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id TEXT NOT NULL,
    interaction_date TIMESTAMP NOT NULL,
    interaction_type TEXT NOT NULL,
    customer_id TEXT,
    session_id TEXT,
    response_time_sec REAL,
    satisfaction_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_name TEXT,
    activity_description TEXT,
    status_badge TEXT,
    message_count INTEGER
);
CREATE INDEX idx_customer_interactions_customer_id ON customer_interactions(customer_id);
CREATE INDEX idx_customer_interactions_type ON customer_interactions(interaction_type);

-- Schema for table: interaction_summary
CREATE TABLE interaction_summary (
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
CREATE INDEX idx_interaction_summary_record_date ON interaction_summary(record_date);

-- Schema for table: revenue_summary
CREATE TABLE revenue_summary (
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
CREATE INDEX idx_revenue_summary_record_date ON revenue_summary(record_date);

-- Schema for table: revenue_attribution
CREATE TABLE revenue_attribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    ai_feature TEXT NOT NULL,
    revenue_amount REAL NOT NULL,
    percentage REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_revenue_attribution_ai_feature ON revenue_attribution(ai_feature);

-- Schema for table: category_revenue
CREATE TABLE category_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    category_name TEXT NOT NULL,
    revenue_amount REAL NOT NULL,
    percentage REAL,
    ai_attributed_revenue REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_category_revenue_category_name ON category_revenue(category_name);

-- Schema for table: customer_value_analysis
CREATE TABLE customer_value_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    tier_name TEXT NOT NULL,
    customer_count INTEGER,
    avg_revenue REAL,
    total_revenue REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_value_tier_name ON customer_value_analysis(tier_name);

-- Schema for table: revenue_forecasting
CREATE TABLE revenue_forecasting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_revenue REAL,
    confidence_level REAL,
    upper_bound REAL,
    lower_bound REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_revenue_forecasting_forecast_date ON revenue_forecasting(forecast_date);

-- Schema for table: system_health
CREATE TABLE system_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date TIMESTAMP NOT NULL,
    system_component TEXT NOT NULL,
    status TEXT NOT NULL,
    cpu_usage REAL,
    memory_usage REAL,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_system_health_component ON system_health(system_component);

-- Schema for table: api_endpoints
CREATE TABLE api_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_name TEXT NOT NULL,
    method TEXT NOT NULL,
    request_count INTEGER,
    avg_response_ms REAL,
    error_rate REAL,
    last_checked TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    base_url TEXT,
    success_rate REAL,
    daily_calls INTEGER
);
CREATE INDEX idx_api_endpoints_endpoint_name ON api_endpoints(endpoint_name);

-- Schema for table: billing_summary
CREATE TABLE billing_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    plan_name TEXT NOT NULL,
    base_cost REAL NOT NULL,
    usage_cost REAL,
    total_cost REAL NOT NULL,
    api_calls INTEGER,
    data_processed_gb REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monthly_price REAL,
    renewal_date TEXT,
    subscription_amount REAL,
    chat_amount REAL,
    image_amount REAL,
    questionnaire_amount REAL,
    overage_amount REAL,
    total_estimated REAL
);
CREATE INDEX idx_billing_summary_plan_name ON billing_summary(plan_name);

-- Schema for table: usage_breakdown
CREATE TABLE usage_breakdown (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    service_name TEXT NOT NULL,
    usage_count INTEGER,
    cost REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    month TEXT,
    usage_type TEXT,
    used INTEGER,
    free_limit INTEGER,
    overage_rate TEXT,
    overage_cost TEXT,
    total_usage INTEGER
);
CREATE INDEX idx_usage_breakdown_service_name ON usage_breakdown(service_name);

-- Schema for table: api_configurations
CREATE TABLE api_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_type TEXT NOT NULL,
    api_name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT,
    status TEXT DEFAULT 'active',
    last_sync TIMESTAMP,
    sync_frequency TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_api_config_api_type ON api_configurations(api_type);

-- Schema for table: customer_satisfaction
CREATE TABLE customer_satisfaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    overall_satisfaction REAL NOT NULL,
    product_match_quality REAL NOT NULL,
    ai_helpfulness REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_satisfaction_record_date ON customer_satisfaction(record_date);

-- Schema for table: realtime_metrics
CREATE TABLE realtime_metrics (
    recorded_at TEXT PRIMARY KEY,
    active_sessions INTEGER,
    api_response_time_ms INTEGER,
    cpu_usage_pct REAL,
    memory_usage_pct REAL,
    conversions_per_min INTEGER
);

-- Schema for table: billing_payments
CREATE TABLE billing_payments (
    payment_date TEXT,
    description TEXT,
    amount REAL,
    status TEXT,
    invoice_url TEXT
);
CREATE INDEX idx_billing_payments_status ON billing_payments(status);

-- Schema for table: usage_alerts
CREATE TABLE usage_alerts (
    level TEXT,
    title TEXT,
    message TEXT,
    created_at TEXT
);
CREATE INDEX idx_usage_alerts_level ON usage_alerts(level);

-- Extra indexes per your preferred naming convention
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
