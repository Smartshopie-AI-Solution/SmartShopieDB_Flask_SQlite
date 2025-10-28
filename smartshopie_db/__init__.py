"""
SmartShopie AI - Client Analytics Dashboard Database Package
A Python package for managing and integrating with the SmartShopie dashboard database.
"""

__version__ = "1.0.0"
__author__ = "SmartShopie Team"

from smartshopie_db.database import SmartShopieDB
from smartshopie_db.models import (
    OverviewKPI,
    ConversionFunnel,
    InteractionType,
    ConversionAnalytics,
    CustomerSegment,
    ProductAnalytics,
    RevenueSummary,
    AIPerformance
)

__all__ = [
    'SmartShopieDB',
    'OverviewKPI',
    'ConversionFunnel',
    'InteractionType',
    'ConversionAnalytics',
    'CustomerSegment',
    'ProductAnalytics',
    'RevenueSummary',
    'AIPerformance',
]


