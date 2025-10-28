"""
Data models for SmartShopie AI Dashboard

This module defines the data models/classes that represent
the data structure for each dashboard tab.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List


@dataclass
class OverviewKPI:
    """Model for Overview tab KPIs"""
    total_customers: int
    total_customers_change: float
    conversion_rate: float
    conversion_rate_change: float
    ai_interactions: int
    ai_interactions_change: float
    revenue_impact: float
    revenue_impact_change: float
    record_date: str


@dataclass
class ConversionFunnel:
    """Model for conversion funnel data"""
    stage_name: str
    stage_order: int
    count: int
    percentage: float
    dropoff_rate: float
    record_date: str


@dataclass
class InteractionType:
    """Model for interaction types"""
    interaction_name: str
    count: int
    percentage: float
    record_date: str


@dataclass
class ConversionAnalytics:
    """Model for conversion analytics"""
    overall_conversion_rate: float
    conversion_rate_change: float
    ai_driven_conversions: float
    ai_driven_percentage: float
    cart_recovery_rate: float
    cart_recovery_via_ai: float
    avg_time_to_convert: float
    avg_time_change: float
    record_date: str


@dataclass
class CustomerSegment:
    """Model for customer segment data"""
    segment_name: str
    segment_size: int
    percentage: float
    avg_lifetime_value: float
    avg_order_value: float
    record_date: str


@dataclass
class BehavioralPattern:
    """Model for behavioral patterns"""
    pattern_type: str
    pattern_name: str
    value: float
    metric_unit: str
    record_date: str


@dataclass
class CustomerConcern:
    """Model for customer concerns"""
    concern_name: str
    concern_category: str
    query_count: int
    ai_success_rate: float
    record_date: str


@dataclass
class ProductAnalytics:
    """Model for product analytics"""
    product_id: str
    product_name: str
    category: str
    views: int
    ai_recommendations: int
    purchases: int
    revenue: float
    conversion_rate: float
    record_date: str


@dataclass
class RevenueSummary:
    """Model for revenue summary"""
    total_revenue_impact: float
    avg_order_value: float
    avg_order_value_with_ai: float
    avg_order_value_improvement: float
    monthly_investment: float
    monthly_return: float
    roi_percentage: float
    record_date: str


@dataclass
class RevenueAttribution:
    """Model for revenue attribution"""
    ai_feature: str
    revenue_amount: float
    percentage: float
    record_date: str


@dataclass
class AIPerformance:
    """Model for AI performance metrics"""
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    response_time_ms: int
    record_date: str


@dataclass
class SystemHealth:
    """Model for system health monitoring"""
    system_component: str
    status: str
    cpu_usage: float
    memory_usage: float
    response_time_ms: int
    record_date: datetime


@dataclass
class APIConfiguration:
    """Model for API configuration"""
    api_type: str
    api_name: str
    api_url: str
    api_key: Optional[str]
    status: str
    last_sync: Optional[datetime]
    sync_frequency: str


