"""
Database connection and management for SmartShopie AI Dashboard
"""

import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from contextlib import contextmanager


class SmartShopieDB:
    """
    Main database handler for SmartShopie AI Client Analytics Dashboard
    
    This class provides methods to interact with the dashboard database
    for all tabs: Overview, Conversions, Customers, Products, AI Performance,
    Interactions, Revenue, Real-time Monitor, Billing, and API Configuration.
    """
    
    def __init__(self, db_path: str = "smartshopie_dashboard.db"):
        """
        Initialize the database connection
        
        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path
        self.connection = None
    
    def connect(self):
        """Establish connection to the database"""
        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row
        return self.connection
    
    def close(self):
        """Close the database connection"""
        if self.connection:
            self.connection.close()
    
    @contextmanager
    def get_cursor(self):
        """Context manager for database cursor"""
        if not self.connection:
            self.connect()
        cursor = self.connection.cursor()
        try:
            yield cursor
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e
        finally:
            cursor.close()
    
    def initialize_database(self, schema_file: str = "database_schema.sql"):
        """
        Initialize the database with schema
        
        Args:
            schema_file: Path to the SQL schema file
        """
        if not os.path.exists(schema_file):
            raise FileNotFoundError(f"Schema file not found: {schema_file}")
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        with self.get_cursor() as cursor:
            cursor.executescript(schema_sql)
    
    # ============================================================
    # OVERVIEW TAB METHODS
    # ============================================================
    
    def insert_overview_kpi(self, record_date: str, total_customers: int, 
                           total_customers_change: float, conversion_rate: float,
                           conversion_rate_change: float, ai_interactions: int,
                           ai_interactions_change: float, revenue_impact: float,
                           revenue_impact_change: float):
        """Insert or update overview KPI data"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO overview_kpis 
                (record_date, total_customers, total_customers_change, conversion_rate,
                 conversion_rate_change, ai_interactions, ai_interactions_change,
                 revenue_impact, revenue_impact_change)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (record_date, total_customers, total_customers_change, conversion_rate,
                  conversion_rate_change, ai_interactions, ai_interactions_change,
                  revenue_impact, revenue_impact_change))
    
    def get_overview_kpis(self, date: Optional[str] = None) -> List[Dict]:
        """Get overview KPIs for a specific date or latest"""
        with self.get_cursor() as cursor:
            if date:
                cursor.execute("SELECT * FROM overview_kpis WHERE record_date = ? ORDER BY id DESC LIMIT 1", (date,))
            else:
                cursor.execute("SELECT * FROM overview_kpis ORDER BY record_date DESC, id DESC LIMIT 1")
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def insert_conversion_funnel(self, record_date: str, stage_name: str, 
                                stage_order: int, count: int, 
                                percentage: float, dropoff_rate: float):
        """Insert conversion funnel data"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO conversion_funnel 
                (record_date, stage_name, stage_order, count, percentage, dropoff_rate)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (record_date, stage_name, stage_order, count, percentage, dropoff_rate))
    
    def get_conversion_funnel(self, date: Optional[str] = None) -> List[Dict]:
        """Get conversion funnel data for a specific date"""
        with self.get_cursor() as cursor:
            if date:
                cursor.execute("""
                    SELECT * FROM conversion_funnel 
                    WHERE record_date = ? 
                    ORDER BY stage_order
                """, (date,))
            else:
                cursor.execute("""
                    SELECT * FROM conversion_funnel 
                    WHERE record_date = (SELECT MAX(record_date) FROM conversion_funnel)
                    ORDER BY stage_order
                """)
            return [dict(row) for row in cursor.fetchall()]
    
    # ============================================================
    # CONVERSIONS TAB METHODS
    # ============================================================
    
    def insert_conversion_analytics(self, record_date: str, overall_conversion_rate: float,
                                   conversion_rate_change: float, ai_driven_conversions: float,
                                   ai_driven_percentage: float, cart_recovery_rate: float,
                                   cart_recovery_via_ai: float, avg_time_to_convert: float,
                                   avg_time_change: float):
        """Insert conversion analytics data"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO conversion_analytics 
                (record_date, overall_conversion_rate, conversion_rate_change,
                 ai_driven_conversions, ai_driven_percentage, cart_recovery_rate,
                 cart_recovery_via_ai, avg_time_to_convert, avg_time_change)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (record_date, overall_conversion_rate, conversion_rate_change,
                  ai_driven_conversions, ai_driven_percentage, cart_recovery_rate,
                  cart_recovery_via_ai, avg_time_to_convert, avg_time_change))
    
    # ============================================================
    # CUSTOMER INTELLIGENCE TAB METHODS
    # ============================================================
    
    def insert_customer_segment(self, record_date: str, segment_name: str,
                              segment_size: int, percentage: float,
                              avg_lifetime_value: float, avg_order_value: float):
        """Insert customer segment data"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO customer_segments 
                (record_date, segment_name, segment_size, percentage, avg_lifetime_value, avg_order_value)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (record_date, segment_name, segment_size, percentage, avg_lifetime_value, avg_order_value))
    
    # ============================================================
    # REVENUE IMPACT TAB METHODS
    # ============================================================
    
    def insert_revenue_summary(self, record_date: str, total_revenue_impact: float,
                             avg_order_value: float, avg_order_value_with_ai: float,
                             avg_order_value_improvement: float, monthly_investment: float,
                             monthly_return: float, roi_percentage: float):
        """Insert revenue summary data"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO revenue_summary 
                (record_date, total_revenue_impact, avg_order_value, avg_order_value_with_ai,
                 avg_order_value_improvement, monthly_investment, monthly_return, roi_percentage)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (record_date, total_revenue_impact, avg_order_value, avg_order_value_with_ai,
                  avg_order_value_improvement, monthly_investment, monthly_return, roi_percentage))
    
    def insert_revenue_attribution(self, record_date: str, ai_feature: str,
                                  revenue_amount: float, percentage: float):
        """Insert revenue attribution data"""
        with self.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO revenue_attribution 
                (record_date, ai_feature, revenue_amount, percentage)
                VALUES (?, ?, ?, ?)
            """, (record_date, ai_feature, revenue_amount, percentage))
    
    def get_revenue_attribution(self, date: Optional[str] = None) -> List[Dict]:
        """Get revenue attribution data"""
        with self.get_cursor() as cursor:
            if date:
                cursor.execute("""
                    SELECT * FROM revenue_attribution 
                    WHERE record_date = ? 
                    ORDER BY revenue_amount DESC
                """, (date,))
            else:
                cursor.execute("""
                    SELECT * FROM revenue_attribution 
                    WHERE record_date = (SELECT MAX(record_date) FROM revenue_attribution)
                    ORDER BY revenue_amount DESC
                """)
            return [dict(row) for row in cursor.fetchall()]
    
    # ============================================================
    # GENERIC QUERY METHODS
    # ============================================================
    
    def execute_query(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute a custom query and return results as dictionaries"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_all_data_for_tab(self, tab_name: str, date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all data for a specific dashboard tab
        
        Args:
            tab_name: Name of the tab (e.g., 'overview', 'revenue', 'customers')
            date: Optional date filter
            
        Returns:
            Dictionary containing all data for the tab
        """
        data = {}
        
        # Map tab names to their tables
        tab_tables = {
            'overview': ['overview_kpis', 'conversion_funnel', 'interaction_types'],
            'conversions': ['conversion_analytics', 'conversion_trends'],
            'customers': ['customer_segments', 'behavioral_patterns', 'customer_concerns', 
                         'customer_lifetime_value', 'product_gaps'],
            'products': ['product_analytics', 'category_performance'],
            'ai-performance': ['ai_model_performance', 'ai_feature_performance'],
            'interactions': ['customer_interactions', 'interaction_summary'],
            'revenue': ['revenue_summary', 'revenue_attribution', 'category_revenue',
                       'customer_value_analysis', 'revenue_forecasting'],
            'realtime': ['system_health', 'api_endpoints'],
            'billing': ['billing_summary', 'usage_breakdown'],
            'api-config': ['api_configurations']
        }
        
        if tab_name not in tab_tables:
            raise ValueError(f"Unknown tab name: {tab_name}")
        
        for table_name in tab_tables.get(tab_name, []):
            if date:
                query = f"SELECT * FROM {table_name} WHERE record_date = ? ORDER BY id DESC"
                data[table_name] = self.execute_query(query, (date,))
            else:
                query = f"SELECT * FROM {table_name} ORDER BY id DESC LIMIT 100"
                data[table_name] = self.execute_query(query)
        
        return data


def create_database(db_path: str = "smartshopie_dashboard.db", schema_file: str = "database_schema.sql"):
    """
    Helper function to create and initialize the database
    
    Args:
        db_path: Path where database will be created
        schema_file: Path to schema SQL file
        
    Returns:
        SmartShopieDB instance
    """
    db = SmartShopieDB(db_path)
    db.initialize_database(schema_file)
    return db


