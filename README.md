# Flask Server Database Implementation using SQLite3

A Flask-based analytics dashboard backend with SQLite3 database for SmartShopie AI platform, providing RESTful API endpoints for real-time data visualization and analytics.

## Quick Start

### Prerequisites
- Python 3.7+
- pip

### Installation

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create database from schema
sqlite3 smartshopie_dashboard.db < database_schema.sql

# 3. Seed demo data (optional but recommended)
python seed_demo_data.py

# 4. Start Flask server
python run.py

# 5. Access dashboard
# Open browser: http://localhost:5001
# ⚠️ DO NOT open HTML file directly
```

## Database Setup

### Create Database

```bash
# SQLite command line
sqlite3 smartshopie_dashboard.db < database_schema.sql
```

Or in Python:
```python
import sqlite3

with open('database_schema.sql', 'r') as f:
    schema = f.read()

conn = sqlite3.connect('smartshopie_dashboard.db')
conn.executescript(schema)
conn.close()
```

### Seed Data

The `seed_demo_data.py` script generates 365 days of historical data for all essential tables:

**Seeded Tables:**
- `overview_kpis`, `conversion_funnel`, `interaction_types`
- `conversion_trends`, `customer_segments`, `interaction_summary`
- `revenue_summary`, `revenue_attribution`, `ai_model_performance`
- `customer_satisfaction`, `customer_concerns`, `customer_lifetime_value`
- `behavioral_patterns`

All tables include duplicate checking and support date range filtering (7d, 30d, 90d, 1y).

## API Endpoints

All endpoints support `period` query parameter: `?period=7d|30d|90d|1y`

### Overview
- `GET /api/overview/kpis` - KPI metrics
- `GET /api/overview/funnel` - Conversion funnel
- `GET /api/overview/interaction-types` - Interaction types

### Conversions
- `GET /api/conversions/trends` - Historical trends
- `GET /api/conversions/analytics` - Analytics summary

### Customer Intelligence
- `GET /api/customers/segments` - Segmentation
- `GET /api/customers/behavioral-patterns` - Behavioral patterns
- `GET /api/customers/concerns` - Top concerns
- `GET /api/customers/lifetime-value` - CLV predictions

### Revenue
- `GET /api/revenue/summary` - Revenue summary
- `GET /api/revenue/attribution` - Revenue attribution by AI feature

### AI Performance
- `GET /api/ai/model-performance` - Model metrics
- `GET /api/ai/feature-performance` - Feature performance

### System
- `GET /api/interactions/summary` - Interaction summary
- `GET /api/customer/satisfaction` - Satisfaction trends
- `GET /api/realtime/system-health` - System health
- `GET /api/billing/summary` - Billing summary

### Utility
- `GET /api/health` - Health check

## Project Structure

```
SmartShopieDB/
├── app.py                      # Flask backend
├── dashboard.html              # Dashboard frontend
├── database_schema.sql         # Database schema
├── seed_demo_data.py          # Data seeding script
├── run.py                     # Server startup
├── assets/                     # Static assets (CSS, JS)
├── smartshopie_db/            # Database package
└── smartshopie_dashboard.db   # SQLite database
```

## Database Usage

### Using Database Package

```python
from smartshopie_db import SmartShopieDB
from datetime import date

db = SmartShopieDB("smartshopie_dashboard.db")
db.connect()

# Get KPIs
kpis = db.get_overview_kpis()

# Get funnel
funnel = db.get_conversion_funnel()

db.close()
```

### Direct SQLite Queries

```bash
sqlite3 smartshopie_dashboard.db

# View tables
.tables

# Query data
SELECT * FROM overview_kpis LIMIT 10;
```

## Features

- ✅ RESTful API with Flask
- ✅ SQLite3 database with thread-safe connections
- ✅ Date range filtering (7d, 30d, 90d, 1y)
- ✅ Real-time dashboard updates
- ✅ Interactive charts with ApexCharts
- ✅ CORS enabled for frontend integration

## Dependencies

```
Flask==3.0.0
Flask-CORS==4.0.0
```

## Notes

- Database uses `threading.local()` for thread-safe SQLite connections
- All endpoints aggregate data based on selected date range
- Seed script prevents duplicate entries with existence checks
- Dashboard must be accessed via Flask server (not file://)

## Status

✅ Production Ready  
✅ Thread-Safe  
✅ Fully Seeded  
✅ API Complete  
