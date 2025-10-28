# SmartShopie Dashboard Database

Complete database design and schema for SmartShopie AI Dashboard analytics.

## 📁 Files

- **`smartshopie_dashboard.db`** - SQLite database with all data (cleaned, no duplicates)
- **`database_schema.sql`** - Complete database schema definitions
- **`smartshopie_db/`** - Python package for database operations

## 🗄️ Database Structure

### Core Tables

#### Overview & KPIs
- **overview_kpis** - Dashboard metrics (customers, conversion, revenue)
- **conversion_funnel** - Customer journey stages
- **interaction_types** - AI interaction statistics

#### Customer Intelligence
- **customer_segments** - Customer segmentation data
- **behavioral_patterns** - Customer behavior analytics
- **customer_concerns** - Top customer concerns
- **customer_interactions** - Live customer activity feed
- **customer_value_analysis** - Customer lifetime value

#### Product & Revenue
- **product_analytics** - Product performance metrics
- **product_gaps** - Product opportunity gaps
- **revenue_summary** - Revenue analytics
- **revenue_attribution** - AI feature revenue attribution
- **category_revenue** - Category-based revenue
- **revenue_forecasting** - Revenue predictions

#### Conversions & Analytics
- **conversion_analytics** - Conversion metrics
- **conversion_trends** - Historical conversion data

#### AI Performance
- **ai_model_performance** - Model accuracy and performance
- **ai_feature_performance** - Feature-specific metrics

#### System & Operations
- **interaction_summary** - Summary statistics
- **system_health** - System monitoring
- **billing_summary** - Usage and billing data
- **usage_breakdown** - Service usage details
- **api_configurations** - API endpoint configs

## 📊 Schema Details

See **`database_schema.sql`** for complete table definitions with:
- Column types and constraints
- Indexes for performance
- Relationships between tables

### Key Tables Structure

**overview_kpis:**
```sql
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
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**conversion_funnel:**
```sql
CREATE TABLE conversion_funnel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date DATE NOT NULL,
    stage_name TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    count INTEGER NOT NULL,
    percentage REAL,
    dropoff_rate REAL,
    created_at TIMESTAMP
);
```

**customer_interactions:**
```sql
CREATE TABLE customer_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id TEXT NOT NULL,
    interaction_date TIMESTAMP NOT NULL,
    interaction_type TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    activity_description TEXT,
    status_badge TEXT,
    message_count INTEGER,
    response_time_sec REAL,
    satisfaction_score INTEGER,
    session_id TEXT,
    created_at TIMESTAMP
);
```

## 🔧 Using the Database Package

### Installation
```bash
pip install flask flask-cors
```

### Basic Usage
```python
from smartshopie_db import SmartShopieDB
from datetime import date

# Connect to database
db = SmartShopieDB("smartshopie_dashboard.db")
db.connect()

# Get overview KPIs
kpis = db.get_overview_kpis()
print(f"Total Customers: {kpis.total_customers}")
print(f"Conversion Rate: {kpis.conversion_rate}%")

# Get conversion funnel
funnel = db.get_conversion_funnel()
for stage in funnel:
    print(f"{stage.stage_name}: {stage.count} ({stage.percentage}%)")

# Get customer interactions
activities = db.get_customer_interactions(limit=10)
for activity in activities:
    print(f"{activity.customer_name}: {activity.activity_description}")

# Close connection
db.close()
```

### Adding Data
```python
from smartshopie_db import SmartShopieDB
from datetime import date

db = SmartShopieDB("smartshopie_dashboard.db")
db.connect()

# Add KPI data
db.add_overview_kpis(
    record_date=date.today(),
    total_customers=20000,
    conversion_rate=25.5,
    revenue_impact=1200000.0
)

# Add conversion funnel stage
db.add_conversion_funnel_stage(
    record_date=date.today(),
    stage_name="Page Visitors",
    stage_order=0,
    count=50000,
    percentage=100.0
)

db.close()
```

## 📈 Database Statistics

### Current Data
- **Records:** ~100+ across all tables
- **Duplicates:** 0 (verified clean)
- **Size:** Clean, optimized
- **Status:** Production ready

### Table Record Counts
- overview_kpis: 1 record
- conversion_funnel: 5 records
- interaction_types: 4 records
- customer_segments: 3 records
- behavioral_patterns: 3 records
- customer_interactions: 4 records
- product_analytics: 5 records
- revenue_summary: 1 record
- revenue_attribution: 4 records
- ai_model_performance: 3 records
- ai_feature_performance: 4 records

## 🔍 Querying the Database

### SQLite Command Line
```bash
sqlite3 smartshopie_dashboard.db

# View all tables
.tables

# Get records from a table
SELECT * FROM overview_kpis;

# Count records
SELECT COUNT(*) FROM conversion_funnel;

# Get recent activities
SELECT customer_name, activity_description, status_badge 
FROM customer_interactions 
ORDER BY interaction_date DESC 
LIMIT 10;
```

### Python Query Examples
```python
import sqlite3

conn = sqlite3.connect('smartshopie_dashboard.db')
cursor = conn.cursor()

# Get all customer segments
cursor.execute("SELECT * FROM customer_segments")
for row in cursor.fetchall():
    print(row)

# Get revenue by category
cursor.execute("""
    SELECT category_name, revenue_amount, percentage 
    FROM category_revenue 
    ORDER BY revenue_amount DESC
""")
for row in cursor.fetchall():
    print(f"{row[0]}: ${row[1]:,.2f} ({row[2]}%)")

conn.close()
```

## 📋 Schema Documentation

See `database_schema.sql` for complete documentation including:
- All table definitions
- Column descriptions
- Data types and constraints
- Index definitions
- Performance optimizations

## 🎯 Database Design Principles

- **Normalized Structure** - Data organized logically across tables
- **No Redundancy** - Duplicates removed
- **Indexed Fields** - Fast queries on date and key fields
- **Timestamp Tracking** - Created/updated tracking
- **Flexible Schema** - Supports historical and real-time data
- **Type Safety** - Proper data types for all fields

## 📞 Database Operations

### Connect
```python
db = SmartShopieDB("smartshopie_dashboard.db")
db.connect()
```

### Read Data
```python
# Get all methods available
data = db.get_overview_kpis()
data = db.get_conversion_funnel()
data = db.get_customer_interactions()
data = db.get_revenue_summary()
```

### Write Data
```python
# Add records
db.add_overview_kpis(...)
db.add_conversion_funnel_stage(...)
db.add_customer_interaction(...)
```

### Close
```python
db.close()
```

## 📝 Notes

- Database is **thread-safe** for concurrent access
- All tables use **SQLite** data types
- **Indexes** are created on date fields for fast filtering
- **Foreign key constraints** are defined where applicable
- Data can be **filtered by date** using date parameters

## 🔐 Database Status

✅ Clean - No duplicate records  
✅ Indexed - Performance optimized  
✅ Documented - Complete schema available  
✅ Tested - All tables verified  

---

**Database:** SQLite 3  
**Schema Version:** 1.0  
**Status:** Production Ready ✅
