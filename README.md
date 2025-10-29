# SmartShopie AI - Client Analytics Dashboard

A comprehensive analytics dashboard for SmartShopie AI platform with real-time data visualization, customer intelligence, revenue analytics, and AI performance tracking.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Date Range Filtering](#date-range-filtering)
- [Usage Guide](#usage-guide)
- [Development](#development)

## ✨ Features

### Dashboard Components

- **Overview Dashboard**
  - Real-time KPI metrics (Total Customers, Conversion Rate, AI Interactions, Revenue Impact)
  - Interactive conversion funnel visualization
  - AI interaction type breakdowns
  - Live customer activity feed

- **Conversion Analytics**
  - Conversion trend analysis with dynamic date range filtering
  - Historical conversion data visualization

- **Customer Intelligence**
  - Customer segmentation analysis
  - Behavioral patterns (Peak Activity, Preference Match, Return Rate)
  - Top skincare & haircare concerns with AI success rates
  - Customer Lifetime Value (CLV) predictions by segment

- **Revenue Analytics**
  - Revenue attribution by AI feature
  - Revenue summary with growth metrics
  - Category-based revenue breakdown
  - Customer value analysis

- **AI Performance**
  - Model accuracy and performance metrics
  - AI recommendation performance (radial charts)
  - Feature-specific performance tracking

- **Interactions**
  - Interaction timeline visualization
  - Summary statistics
  - Real-time interaction tracking

- **System Monitoring**
  - Real-time system health metrics
  - API endpoint monitoring

- **Billing & Usage**
  - Usage breakdown by feature
  - Billing summary and history

### Key Features

- ✅ **Dynamic Date Range Filtering** - Switch between Last 7 Days, 30 Days, 90 Days, and 1 Year
- ✅ **Real-time Data Updates** - All charts update based on selected time period
- ✅ **Interactive Charts** - Built with ApexCharts for smooth animations and interactions
- ✅ **Thread-Safe Database** - SQLite with thread-local connections for Flask
- ✅ **RESTful API** - Complete backend API with CORS support
- ✅ **Clean Architecture** - Organized codebase with clear separation of concerns

## 📁 Project Structure

```
SmartShopieDB/
├── assets/                      # Static assets directory
│   ├── chart.js                # Chart library utilities
│   ├── dashboard.css           # Main dashboard styles
│   ├── dashboard.js            # Frontend JavaScript logic
│   └── image.svg              # Dashboard images
│
├── smartshopie_db/             # Database package
│   ├── __init__.py            # Package initialization
│   ├── database.py            # Database operations class
│   └── models.py              # Data models
│
├── app.py                      # Flask backend application
├── dashboard.html              # Main dashboard HTML
├── database_schema.sql         # Complete database schema
├── run.py                      # Server startup script
├── seed_demo_data.py           # Database seeding script
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── .gitignore                 # Git ignore rules
└── smartshopie_dashboard.db    # SQLite database

```

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Clone or download the repository**

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Setup the database:**
   
   **Option A: Using existing database (if `smartshopie_dashboard.db` already exists)**
   
   If you already have a database file, you can skip this step. The database will be used as-is.
   
   **Option B: Create new database from schema**
   
   ```bash
   # Create the database from schema
   sqlite3 smartshopie_dashboard.db < database_schema.sql
   ```
   
   Or in Python:
   ```python
   import sqlite3
   
   # Read and execute schema
   with open('database_schema.sql', 'r') as f:
       schema = f.read()
   
   conn = sqlite3.connect('smartshopie_dashboard.db')
   conn.executescript(schema)
   conn.close()
   ```

4. **Seed the database with demo data:**
   
   ```bash
   python seed_demo_data.py
   ```
   
   This will:
   - Generate 365 days of historical data (from 1 year ago to today)
   - Populate all essential tables with realistic, varied data
   - Include duplicate checking to prevent duplicate entries
   - Support all date range filters (7d, 30d, 90d, 1y)
   
   **Note**: The seed script populates the following tables:
   - ✅ `overview_kpis` (daily) - Main KPI metrics
   - ✅ `conversion_funnel` (weekly) - Conversion funnel stages
   - ✅ `interaction_types` (bi-weekly) - AI interaction breakdowns
   - ✅ `conversion_trends` (daily) - Historical conversion data with dramatic variations
   - ✅ `customer_segments` (snapshot) - Customer segmentation data
   - ✅ `interaction_summary` (weekly) - Interaction summary statistics
   - ✅ `revenue_summary` (monthly) - Revenue analytics
   - ✅ `revenue_attribution` (daily) - Revenue attribution by AI feature
   - ✅ `ai_model_performance` (monthly) - AI model accuracy and performance
   - ✅ `customer_satisfaction` (daily) - Customer satisfaction trends
   - ✅ `customer_concerns` (daily) - Top customer concerns with AI success rates
   - ✅ `customer_lifetime_value` (daily) - CLV predictions by segment
   - ✅ `behavioral_patterns` (daily) - Behavioral pattern insights
   
   **Tables not seeded** (optional/static/real-time data):
   - `customer_interactions` - Real-time activity feed, populated as users interact
   - `product_analytics`, `product_gaps` - Can be seeded separately if needed
   - `conversion_analytics` - Alternative analytics view (can be derived from other tables)
   - `category_performance`, `category_revenue` - Product category analytics
   - `ai_feature_performance` - Feature-specific performance (optional)
   - `customer_value_analysis`, `revenue_forecasting` - Advanced analytics (optional)
   - `system_health`, `billing_summary`, `usage_breakdown`, `api_configurations` - Administrative data

5. **Start the Flask server:**
   ```bash
   python run.py
   ```

6. **Access the dashboard:**
   - Open your browser and navigate to: **http://localhost:5001**
   - ⚠️ **Important**: Do NOT open the HTML file directly. It must be accessed through the Flask server.

### Health Check

Test the API health endpoint:
```bash
curl http://localhost:5001/api/health
```

## 📡 API Endpoints

### Overview & KPIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/overview/kpis` | GET | Get overview KPI metrics (customers, conversion, revenue, AI interactions) |
| `/api/overview/funnel` | GET | Get conversion funnel data with stage breakdown |
| `/api/overview/interaction-types` | GET | Get AI interaction type statistics |

### Conversions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversions/analytics` | GET | Get conversion analytics summary |
| `/api/conversions/trends` | GET | Get historical conversion trends |

### Customer Intelligence

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/customers/segments` | GET | Get customer segmentation data |
| `/api/customers/behavioral-patterns` | GET | Get behavioral pattern insights |
| `/api/customers/concerns` | GET | Get top customer concerns with AI success rates |
| `/api/customers/lifetime-value` | GET | Get customer lifetime value predictions |
| `/api/customers/interactions` | GET | Get recent customer interactions |

### Revenue Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/revenue/summary` | GET | Get revenue summary statistics |
| `/api/revenue/attribution` | GET | Get revenue attribution by AI feature |
| `/api/revenue/category` | GET | Get revenue by product category |
| `/api/revenue/customer-value` | GET | Get customer value analysis |

### AI Performance

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/model-performance` | GET | Get AI model performance metrics |
| `/api/ai/feature-performance` | GET | Get feature-specific performance data |

### Interactions & System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/interactions/summary` | GET | Get interaction summary statistics |
| `/api/customer/satisfaction` | GET | Get customer satisfaction trends |
| `/api/realtime/system-health` | GET | Get real-time system health metrics |
| `/api/billing/summary` | GET | Get billing and usage summary |

### Utility Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check endpoint |
| `/assets/<filename>` | GET | Serve static assets |

### Query Parameters

All data endpoints support date range filtering via the `period` query parameter:

- `period=7d` - Last 7 days
- `period=30d` - Last 30 days (default)
- `period=90d` - Last 90 days
- `period=1y` - Last 1 year

Example:
```
GET /api/overview/kpis?period=30d
GET /api/revenue/attribution?period=90d
```

## 🗄️ Database Schema

The database uses SQLite with a comprehensive schema supporting:

### Core Tables

- **Overview & KPIs**: `overview_kpis`, `conversion_funnel`, `interaction_types`
- **Customer Intelligence**: `customer_segments`, `behavioral_patterns`, `customer_concerns`, `customer_lifetime_value`, `customer_interactions`
- **Revenue Analytics**: `revenue_summary`, `revenue_attribution`, `category_revenue`, `customer_value_analysis`
- **Product Analytics**: `product_analytics`, `product_gaps`
- **Conversions**: `conversion_analytics`, `conversion_trends`
- **AI Performance**: `ai_model_performance`, `ai_feature_performance`
- **System & Operations**: `interaction_summary`, `system_health`, `billing_summary`, `usage_breakdown`
- **Customer Satisfaction**: `customer_satisfaction`

See `database_schema.sql` for complete schema definitions with all columns, constraints, and indexes.

## 📅 Date Range Filtering

The dashboard supports dynamic date range filtering across all components:

### Available Periods

- **Last 7 Days** - Daily granularity
- **Last 30 Days** - Daily granularity
- **Last 90 Days** - Weekly aggregation
- **Last 1 Year** - Monthly aggregation

### How It Works

1. Select a period using the date range selector in the top header
2. All charts and KPIs automatically update to show data for the selected period
3. The backend aggregates data appropriately:
   - Daily aggregation for 7d/30d periods
   - Weekly aggregation for 90d period
   - Monthly aggregation for 1y period

### Frontend Implementation

The frontend uses `currentDateRange` variable to track the selected period and passes it to all API calls via the `period` query parameter.

## 💻 Usage Guide

### Using the Database Package

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

# Add new KPI data
db.add_overview_kpis(
    record_date=date.today(),
    total_customers=25000,
    conversion_rate=28.5,
    revenue_impact=1500000.0
)

# Close connection
db.close()
```

### Seeding Demo Data

To populate the database with realistic demo data:

```bash
python seed_demo_data.py
```

This will:
- Generate data for all tables
- Create data for multiple date ranges (7d, 30d, 90d, 1y)
- Prevent duplicate entries
- Add varied, realistic data with proper fluctuations

### Querying the Database

#### SQLite Command Line

```bash
sqlite3 smartshopie_dashboard.db

# View all tables
.tables

# Get records from a table
SELECT * FROM overview_kpis LIMIT 10;

# Count records
SELECT COUNT(*) FROM customer_segments;

# Query with date filter
SELECT * FROM customer_lifetime_value 
WHERE record_date BETWEEN '2024-10-01' AND '2024-10-29'
ORDER BY record_date DESC;
```

#### Python Direct Query

```python
import sqlite3

conn = sqlite3.connect('smartshopie_dashboard.db')
cursor = conn.cursor()

# Get revenue by category
cursor.execute("""
    SELECT category_name, SUM(revenue_amount) as total
    FROM category_revenue 
    GROUP BY category_name
    ORDER BY total DESC
""")

for row in cursor.fetchall():
    print(f"{row[0]}: €{row[1]:,.2f}")

conn.close()
```

## 🔧 Development

### Project Architecture

- **Backend**: Flask (Python) with SQLite database
- **Frontend**: Vanilla JavaScript with ApexCharts for visualizations
- **Database**: SQLite with thread-safe connections
- **API**: RESTful API with JSON responses

### Key Implementation Details

- **Thread Safety**: Uses `threading.local()` for SQLite connections in Flask's multi-threaded environment
- **Date Filtering**: All endpoints support `period` query parameter for date range filtering
- **Data Aggregation**: Backend aggregates data appropriately based on selected period (daily/weekly/monthly)
- **Error Handling**: Comprehensive error handling with meaningful error messages
- **Caching**: Frontend uses cache-busting query parameters to prevent stale data

### Adding New Features

1. **Add Database Table**: Update `database_schema.sql`
2. **Add Database Methods**: Extend `smartshopie_db/database.py`
3. **Add API Endpoint**: Add route in `app.py` with date filtering
4. **Add Frontend**: Create fetch function in `assets/dashboard.js` and chart update function
5. **Update HTML**: Add chart container in `dashboard.html`

### Running in Development

```bash
# Enable debug mode (already enabled in run.py)
python run.py

# The server will reload automatically on file changes
```

### Testing API Endpoints

```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Test KPI endpoint with period
curl "http://localhost:5001/api/overview/kpis?period=30d"

# Test customer segments
curl "http://localhost:5001/api/customers/segments?period=90d"
```

## 📦 Dependencies

### Python Packages

```
Flask==3.0.0          # Web framework
Flask-CORS==4.0.0     # Cross-origin resource sharing
```

### Frontend Libraries (CDN)

- **ApexCharts** - Chart visualization library (via CDN)
- **Font Awesome 6.5.0** - Icons (via CDN)

## 🔐 Database Status

✅ **Clean** - No duplicate records  
✅ **Indexed** - Performance optimized with indexes on date fields  
✅ **Thread-Safe** - Thread-local connections for concurrent access  
✅ **Documented** - Complete schema available in `database_schema.sql`  
✅ **Tested** - All tables and endpoints verified  

## 📝 Notes

- The dashboard **must** be accessed via `http://localhost:5001` - do not open the HTML file directly
- Database connections are thread-safe using `threading.local()` for Flask's multi-threaded environment
- All date-based queries filter by `record_date` with proper aggregation
- The frontend automatically handles loading states and error messages
- Charts are cleared and re-rendered when switching date ranges to prevent data duplication

## 🐛 Troubleshooting

### Dashboard Not Loading

- Ensure Flask server is running: `python run.py`
- Check browser console for errors
- Verify you're accessing via `http://localhost:5001`, not `file://`

### API Errors

- Check Flask terminal for error messages
- Verify database file exists: `smartshopie_dashboard.db`
- Test health endpoint: `curl http://localhost:5001/api/health`

### Data Not Updating

- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for API errors
- Verify the `period` parameter is being sent correctly

### Charts Not Displaying

- Check browser console for JavaScript errors
- Verify ApexCharts CDN is loading
- Ensure chart containers exist in HTML

## 📄 License

This project is part of the SmartShopie AI platform.

---

**Version**: 1.0  
**Database**: SQLite 3  
**Python**: 3.7+  
**Status**: Production Ready ✅

For questions or issues, please check the Flask server logs and browser console for detailed error messages.
