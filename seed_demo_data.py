import sqlite3
from datetime import datetime, timedelta, date
import random

DB_PATH = "smartshopie_dashboard.db"

def ensure_tables(conn):
    # Create realtime_metrics table if it doesn't exist (used by realtime monitor)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS realtime_metrics (
            recorded_at TEXT PRIMARY KEY,
            active_sessions INTEGER,
            api_response_time_ms INTEGER,
            cpu_usage_pct REAL,
            memory_usage_pct REAL,
            conversions_per_min INTEGER
        )
        """
    )
    # Billing & Usage tables
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_summary (
            plan_name TEXT,
            monthly_price REAL,
            renewal_date TEXT,
            subscription_amount REAL,
            chat_amount REAL,
            image_amount REAL,
            questionnaire_amount REAL,
            overage_amount REAL,
            total_estimated REAL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS usage_breakdown (
            month TEXT,
            usage_type TEXT,
            used INTEGER,
            free_limit INTEGER,
            overage_rate TEXT,
            overage_cost TEXT,
            total_usage INTEGER
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_payments (
            payment_date TEXT,
            description TEXT,
            amount REAL,
            status TEXT,
            invoice_url TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS usage_alerts (
            level TEXT,
            title TEXT,
            message TEXT,
            created_at TEXT
        )
        """
    )
    # API configurations table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS api_configurations (
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
        )
        """
    )
    conn.commit()

    # --- Lightweight migrations: add expected columns if missing ---
    def ensure_column(table, col, coltype):
        cur.execute(f"PRAGMA table_info({table})")
        cols = {r[1] for r in cur.fetchall()}
        if col not in cols:
            try:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype}")
            except Exception:
                pass

    # API endpoints table to support API Health Monitoring widget
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS api_endpoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint_name TEXT,
            base_url TEXT,
            avg_response_ms INTEGER,
            success_rate REAL,
            daily_calls INTEGER,
            error_rate REAL,
            last_checked TEXT
        )
        """
    )

    # billing_summary expected columns
    for c, t in [
        ('plan_name', 'TEXT'),
        ('monthly_price', 'REAL'),
        ('renewal_date', 'TEXT'),
        ('subscription_amount', 'REAL'),
        ('chat_amount', 'REAL'),
        ('image_amount', 'REAL'),
        ('questionnaire_amount', 'REAL'),
        ('overage_amount', 'REAL'),
        ('total_estimated', 'REAL'),
    ]:
        ensure_column('billing_summary', c, t)

    # usage_breakdown expected columns
    for c, t in [
        ('month', 'TEXT'),
        ('usage_type', 'TEXT'),
        ('used', 'INTEGER'),
        ('free_limit', 'INTEGER'),
        ('overage_rate', 'TEXT'),
        ('overage_cost', 'TEXT'),
        ('total_usage', 'INTEGER'),
    ]:
        ensure_column('usage_breakdown', c, t)

    # billing_payments expected columns
    for c, t in [
        ('payment_date', 'TEXT'),
        ('description', 'TEXT'),
        ('amount', 'REAL'),
        ('status', 'TEXT'),
        ('invoice_url', 'TEXT'),
    ]:
        ensure_column('billing_payments', c, t)

    # usage_alerts expected columns
    for c, t in [
        ('level', 'TEXT'),
        ('title', 'TEXT'),
        ('message', 'TEXT'),
        ('created_at', 'TEXT'),
    ]:
        ensure_column('usage_alerts', c, t)
    conn.commit()

def clear_recent_demo(conn, days=370):
    cur = conn.cursor()
    since = (date.today() - timedelta(days=days)).isoformat()
    tables_with_date = [
        ("overview_kpis", "record_date"),
        ("conversion_funnel", "record_date"),
        ("interaction_types", "record_date"),
        ("conversion_trends", "record_date"),
        ("customer_segments", "record_date"),
        ("interaction_summary", "record_date"),
        ("revenue_summary", "record_date"),
        ("revenue_attribution", "record_date"),
        ("revenue_forecasting", "record_date"),
        ("ai_model_performance", "record_date"),
        ("customer_satisfaction", "record_date"),
        ("customer_concerns", "record_date"),
        ("customer_lifetime_value", "record_date"),
        ("behavioral_patterns", "record_date"),
        ("product_gaps", "record_date"),
        ("category_performance", "record_date"),
        ("product_analytics", "record_date"),
        # realtime metrics uses recorded_at column
        ("realtime_metrics", "recorded_at"),
        ("billing_payments", "payment_date"),
        ("usage_alerts", "created_at"),
        # usage_breakdown stores month as TEXT but not necessarily DATE, skip date-based delete
    ]
    # Clear date-based tables
    for table, col in tables_with_date:
        cur.execute(f"DELETE FROM {table} WHERE DATE({col}) >= DATE(?)", (since,))
    # Manually clear usage_breakdown by month text (safe for reseed)
    try:
        cur.execute("DELETE FROM usage_breakdown")
    except Exception:
        pass
    conn.commit()

def check_exists(cur, table, where_clause, params):
    """Check if a record exists matching the WHERE clause"""
    query = f"SELECT COUNT(*) FROM {table} WHERE {where_clause}"
    cur.execute(query, params)
    return cur.fetchone()[0] > 0

def seed_overview_kpis(conn, start_date: date, end_date: date):
    cur = conn.cursor()
    d = start_date
    # Small business scale
    customers = 600
    ai_interactions = 1500
    revenue = 150000.0  # INR
    inserted = 0
    skipped = 0
    while d <= end_date:
        date_str = d.isoformat()
        # Check if record exists for this date
        if check_exists(cur, "overview_kpis", "record_date = ?", (date_str,)):
            skipped += 1
            d += timedelta(days=1)
            continue
            
        growth = random.uniform(-0.8, 1.8)
        customers = max(1000, int(customers * (1 + growth/100)))
        conv_rate = max(2.0, min(20.0, 10.0 + random.uniform(-3, 3)))
        ai_interactions = max(200, int(ai_interactions * (1 + random.uniform(-1, 1)/100)))
        revenue = max(20000.0, revenue * (1 + random.uniform(-2, 3)/100))
        cur.execute(
            """
            INSERT INTO overview_kpis(
                record_date,total_customers,total_customers_change,
                conversion_rate,conversion_rate_change,
                ai_interactions,ai_interactions_change,
                revenue_impact,revenue_impact_change
            ) VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (
                date_str,
                customers,
                round(growth, 2),
                round(conv_rate, 2),
                round(random.uniform(-1.0, 1.5), 2),
                ai_interactions,
                round(random.uniform(-1.0, 1.5), 2),
                round(revenue, 2),
                round(random.uniform(-1.0, 2.0), 2),
            ),
        )
        inserted += 1
        d += timedelta(days=1)
    conn.commit()
    print(f"  overview_kpis: {inserted} inserted, {skipped} skipped")

def seed_conversion_funnel(conn, start_date: date, end_date: date):
    cur = conn.cursor()
    stages = [
        ("Page Visitors", 0, 1.00),
        ("AI Interaction", 1, 0.65),
        ("Product View", 2, 0.42),
        ("Add to Cart", 3, 0.31),
        ("Purchase", 4, 0.25),
    ]
    d = start_date
    inserted = 0
    skipped = 0
    while d <= end_date:
        date_str = d.isoformat()
        base = random.randint(300, 1200)
        for name, order, pct in stages:
            # Check if record exists
            if check_exists(cur, "conversion_funnel", "record_date = ? AND stage_name = ?", (date_str, name)):
                skipped += 1
                continue
                
            count = int(base * pct * random.uniform(0.9, 1.1))
            dropoff = -round(random.uniform(0, 10), 1)
            cur.execute(
                """
                INSERT INTO conversion_funnel(record_date,stage_name,stage_order,count,percentage,dropoff_rate)
                VALUES(?,?,?,?,?,?)
                """,
                (date_str, name, order, count, round(pct*100, 1), dropoff),
            )
            inserted += 1
        d += timedelta(days=7)
    conn.commit()
    print(f"  conversion_funnel: {inserted} inserted, {skipped} skipped")

def seed_interaction_types(conn, start_date: date, end_date: date):
    cur = conn.cursor()
    names = ["Questionnaire", "Chat Sessions", "Image Analysis", "Routine Planner"]
    d = start_date
    inserted = 0
    skipped = 0
    while d <= end_date:
        date_str = d.isoformat()
        total = random.randint(500, 2000)
        weights = [random.uniform(0.25, 0.4), random.uniform(0.35, 0.5), random.uniform(0.1, 0.2), random.uniform(0.05, 0.15)]
        wsum = sum(weights)
        for n, w in zip(names, weights):
            # Check if record exists
            if check_exists(cur, "interaction_types", "record_date = ? AND interaction_name = ?", (date_str, n)):
                skipped += 1
                continue
                
            c = int(total * (w/wsum))
            cur.execute(
                "INSERT INTO interaction_types(record_date,interaction_name,count,percentage) VALUES(?,?,?,?)",
                (date_str, n, c, round(100.0*(w/wsum), 1)),
            )
            inserted += 1
        d += timedelta(days=14)
    conn.commit()
    print(f"  interaction_types: {inserted} inserted, {skipped} skipped")

def seed_conversion_trends(conn, start_date: date, end_date: date):
    cur = conn.cursor()
    d = start_date
    inserted = 0
    skipped = 0
    
    # Base conversion rate (will fluctuate around this)
    base_conversion_rate = 9.0
    days_passed = 0
    previous_rate = base_conversion_rate
    trend_direction = 1  # 1 for up, -1 for down
    
    while d <= end_date:
        date_str = d.isoformat()
        # Check if record exists
        if check_exists(cur, "conversion_trends", "record_date = ?", (date_str,)):
            skipped += 1
            d += timedelta(days=1)
            days_passed += 1
            continue
        
        # Get month and day of week for seasonal/weekly patterns
        month = d.month
        day_of_week = d.weekday()  # 0=Monday, 6=Sunday
        day_of_month = d.day
        
        # DRAMATIC Seasonal variations (much higher peaks, deeper valleys)
        seasonal_factor = 1.0
        if month == 11:  # November - Black Friday prep (MAJOR SPIKE)
            seasonal_factor = 1.8 + random.uniform(-0.2, 0.4)  # Up to 2.2x!
        elif month == 12:  # December - Holiday shopping (PEAK SEASON)
            seasonal_factor = 2.0 + random.uniform(-0.3, 0.5)  # Up to 2.5x!
        elif month == 10:  # October - Pre-holiday buildup
            seasonal_factor = 1.3 + random.uniform(-0.15, 0.25)
        elif month in [1, 2]:  # January/February - DEEP post-holiday slump
            seasonal_factor = 0.6 + random.uniform(-0.2, 0.1)  # Down to 0.4x!
        elif month in [6, 7]:  # Summer - Major slowdown
            seasonal_factor = 0.65 + random.uniform(-0.15, 0.1)  # Down to 0.5x!
        elif month in [3, 4]:  # Spring recovery (BOUNCE BACK)
            seasonal_factor = 1.25 + random.uniform(-0.2, 0.3)
        elif month == 9:  # September - Back to school spike
            seasonal_factor = 1.35 + random.uniform(-0.15, 0.25)
        elif month in [5, 8]:  # May/August - Mixed patterns
            seasonal_factor = 0.9 + random.uniform(-0.25, 0.3)
        
        # More dramatic weekly pattern
        weekly_factor = 1.0
        if day_of_week >= 5:  # Weekend - BIGGER drop
            weekly_factor = 0.7 + random.uniform(-0.15, 0.2)  # Can go as low as 0.55x
        else:  # Weekday - BIGGER boost
            weekly_factor = 1.15 + random.uniform(-0.1, 0.25)  # Can go up to 1.4x
        
        # More dramatic monthly cycle
        monthly_cycle = 1.0
        if 7 <= day_of_month <= 22:
            monthly_cycle = 1.2 + random.uniform(-0.15, 0.2)  # Peaks at 1.4x
        else:
            monthly_cycle = 0.85 + random.uniform(-0.2, 0.1)  # Can drop to 0.65x
        
        # DRAMATIC Random fluctuations - create BIG spikes and dips
        weekly_fluctuation = 1.0
        if days_passed % 7 == 0:  # Weekly - MAJOR spikes/dips
            weekly_fluctuation = random.uniform(0.5, 1.5)  # Can be 2x or half!
        elif days_passed % 14 == 0:  # Bi-weekly - Big patterns
            weekly_fluctuation = random.uniform(0.6, 1.4)
        elif days_passed % 21 == 0:  # Every 3 weeks - add more variation
            weekly_fluctuation = random.uniform(0.65, 1.45)
        elif days_passed % 30 == 0:  # Monthly - EXTREME patterns
            weekly_fluctuation = random.uniform(0.4, 1.6)  # Very extreme!
        elif days_passed % 10 == 0:  # Every 10 days - add mid-cycle variations
            weekly_fluctuation = random.uniform(0.7, 1.4)
        elif days_passed % 5 == 0:  # Every 5 days - frequent swings
            weekly_fluctuation = random.uniform(0.8, 1.3)
        else:
            weekly_fluctuation = 1.0 + random.uniform(-0.25, 0.25)  # More daily variation
        
        # Create dramatic trend reversals
        trend_factor = 1.0
        if days_passed % 45 == 0:  # Every 6-7 weeks - MAJOR reversal
            trend_factor = random.uniform(0.7, 1.5)  # Can swing 70% either way!
            trend_direction *= -1  # Reverse direction
        elif days_passed % 30 == 0:  # Monthly - Significant trend change
            trend_factor = random.uniform(0.75, 1.4)
        elif days_passed % 20 == 0:  # Every ~3 weeks - Medium reversal
            trend_factor = random.uniform(0.85, 1.3)
        
        # Add directional momentum (trend continuation)
        if trend_direction > 0:
            momentum = 1.0 + (days_passed % 30) * 0.01  # Builds up
        else:
            momentum = 1.0 - (days_passed % 30) * 0.01  # Declines
        
        # Calculate current conversion rate with all factors
        current_rate = base_conversion_rate * seasonal_factor * weekly_factor * monthly_cycle * weekly_fluctuation * trend_factor * momentum
        
        # Less smoothing for more dramatic swings (40% previous, 60% new)
        current_rate = previous_rate * 0.4 + current_rate * 0.6
        
        # More dramatic daily random noise
        daily_noise = random.uniform(0.85, 1.15)  # ±15% daily variation
        current_rate *= daily_noise
        
        # Special event days - create extreme spikes
        if day_of_month in [11, 24]:  # Mid-month special events
            current_rate *= random.uniform(1.2, 1.6)  # Major spike!
        elif day_of_month in [1, 15]:  # Beginning/mid-month dips
            current_rate *= random.uniform(0.65, 0.9)  # Significant dip
        
        # Ensure rate stays within dramatic but reasonable bounds (3% to 45%)
        current_rate = max(3.0, min(45.0, current_rate))
        
        # Calculate conversions based on rate (assuming ~10,000-12,000 daily visitors)
        daily_visitors = random.randint(600, 1500)
        conversions = int(daily_visitors * current_rate / 100.0)
        ai_attr = int(conversions * random.uniform(0.55, 0.75))
        
        cur.execute(
            "INSERT INTO conversion_trends(record_date,period_type,conversions,ai_attributed_conversions) VALUES(?,?,?,?)",
            (date_str, "daily", conversions, ai_attr),
        )
        inserted += 1
        previous_rate = current_rate
        d += timedelta(days=1)
        days_passed += 1
    conn.commit()
    print(f"  conversion_trends: {inserted} inserted, {skipped} skipped")

def seed_customer_segments(conn, start_date: date, end_date: date):
    """Seed customer_segments weekly across the range so periods differ."""
    cur = conn.cursor()
    segments = [
        ("New Visitors", 220, 12.0, 35.0),
        ("Returning Customers", 160, 30.0, 55.0),
        ("Occasional Users", 120, 18.0, 30.0),
        ("Loyalists", 80, 60.0, 85.0),
    ]
    d = start_date
    inserted = 0
    skipped = 0
    random.seed(42)
    while d <= end_date:
        date_str = d.isoformat()
        # Apply stronger drift/variation to make periods visibly different
        drift = (d - start_date).days / 365.0
        for name, base_size, clv, aov in segments:
            size = int(base_size * (1.0 + random.uniform(-0.3, 0.3)) * (1.0 + drift * random.uniform(-0.25, 0.35)))
            size = max(200, size)
            if check_exists(cur, "customer_segments", "record_date = ? AND segment_name = ?", (date_str, name)):
                skipped += 1
                continue
            cur.execute(
                """
                INSERT INTO customer_segments(record_date,segment_name,segment_size,percentage,avg_lifetime_value,avg_order_value)
                VALUES(?,?,?,?,?,?)
                """,
                (date_str, name, size, None, clv, aov),
            )
            inserted += 1
        d += timedelta(days=7)
    conn.commit()
    print(f"  customer_segments: {inserted} inserted, {skipped} skipped")

def seed_interaction_summary(conn, start_date: date, end_date: date):
    cur = conn.cursor()
    d = start_date
    inserted = 0
    skipped = 0
    while d <= end_date:
        date_str = d.isoformat()
        # Check if record exists
        if check_exists(cur, "interaction_summary", "record_date = ?", (date_str,)):
            skipped += 1
            d += timedelta(days=1)
            continue
            
        # Daily totals with weekly seasonality
        dow = d.weekday()  # 0=Mon
        base = 900 if dow < 5 else 650  # weekdays higher than weekends
        total = int(base * random.uniform(0.9, 1.3))
        chat = int(total * random.uniform(0.35, 0.5))
        questionnaire = int(total * random.uniform(0.25, 0.4))
        image = int(total * random.uniform(0.1, 0.2))
        routine = max(0, total - chat - questionnaire - image)
        avg_resp = random.uniform(60, 240)  # seconds
        cur.execute(
            """
            INSERT INTO interaction_summary(
                record_date,total_interactions,chat_interactions,questionnaire_interactions,
                image_analysis_interactions,routine_planner_interactions,avg_response_time
            ) VALUES(?,?,?,?,?,?,?)
            """,
            (date_str, total, chat, questionnaire, image, routine, round(avg_resp, 1)),
        )
        inserted += 1
        d += timedelta(days=1)
    conn.commit()
    print(f"  interaction_summary: {inserted} inserted, {skipped} skipped")

def seed_revenue_summary(conn, start_date: date, end_date: date):
    """Seed revenue_summary table - monthly records derived from attribution when available.

    This keeps the top KPIs in Revenue Impact aligned with the Attribution chart totals.
    """
    cur = conn.cursor()
    d = start_date
    inserted = 0
    skipped = 0
    # Round start_date to beginning of month
    d = date(d.year, d.month, 1)
    
    while d <= end_date:
        date_str = d.isoformat()
        # Check if record exists
        if check_exists(cur, "revenue_summary", "record_date = ?", (date_str,)):
            skipped += 1
            # Move to next month
            if d.month == 12:
                d = date(d.year + 1, 1, 1)
            else:
                d = date(d.year, d.month + 1, 1)
            continue
            
        # Derive monthly total from daily attribution if present
        next_month = date(d.year + (1 if d.month == 12 else 0), 1 if d.month == 12 else d.month + 1, 1)
        cur.execute(
            """
            SELECT SUM(revenue_amount)
            FROM revenue_attribution
            WHERE DATE(record_date) >= DATE(?) AND DATE(record_date) < DATE(?)
            """,
            (date_str, next_month.isoformat()),
        )
        total_from_attr = cur.fetchone()[0]
        total_revenue_impact = float(total_from_attr) if total_from_attr is not None else random.uniform(600000, 1600000)
        aov = random.uniform(120, 260)
        aov_with_ai = aov * random.uniform(1.1, 1.4)
        aov_improvement = ((aov_with_ai - aov) / max(aov, 1)) * 100.0
        investment = 25000.0
        monthly_return = total_revenue_impact  # treat per-month total as monthly return for ROI
        roi_percentage = ((monthly_return - investment) / max(investment, 1)) * 100.0
        cur.execute(
            """
            INSERT INTO revenue_summary(
                record_date,total_revenue_impact,avg_order_value,avg_order_value_with_ai,avg_order_value_improvement,monthly_investment,monthly_return,roi_percentage
            ) VALUES(?,?,?,?,?,?,?,?)
            """,
            (
                date_str,
                round(total_revenue_impact, 2),
                round(aov, 2),
                round(aov_with_ai, 2),
                round(aov_improvement, 2),
                investment,
                round(monthly_return, 2),
                round(roi_percentage, 2),
            ),
        )
        inserted += 1
        # Move to next month
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)
    conn.commit()
    print(f"  revenue_summary: {inserted} inserted, {skipped} skipped")

def seed_revenue_forecasting(conn, months_ahead: int = 6):
    """Seed revenue_forecasting for the next N months using recent monthly totals.

    Tries to insert into columns (forecast_date, forecast_value). If that fails,
    it falls back to (forecast_date, predicted_revenue) to match alternate schemas.
    """
    cur = conn.cursor()
    # Read last 6 revenue_summary rows (monthly totals)
    cur.execute(
        """
        SELECT record_date, total_revenue_impact
        FROM revenue_summary
        ORDER BY DATE(record_date) DESC
        LIMIT 6
        """
    )
    rows = cur.fetchall()
    if not rows:
        print("  revenue_forecasting: skipped (no revenue_summary rows)")
        return
    rows = list(reversed(rows))  # chronological order
    values = [float(r[1] or 0) for r in rows]
    # Average recent growth (clamped)
    growths = []
    for i in range(1, len(values)):
        prev = values[i-1] or 1.0
        growths.append(max(-0.2, min(0.25, (values[i]-prev)/prev)))
    avg_growth = sum(growths)/len(growths) if growths else 0.05

    last_month = date.fromisoformat(rows[-1][0]) if isinstance(rows[-1][0], str) else rows[-1][0]
    year, month = last_month.year, last_month.month
    value = values[-1]
    inserted = 0
    today_str = date.today().isoformat()
    for _ in range(months_ahead):
        month += 1
        if month > 12:
            month = 1
            year += 1
        mdate = date(year, month, 1)
        value = max(0.0, value * (1.0 + avg_growth + random.uniform(-0.03, 0.03)))
        if check_exists(cur, 'revenue_forecasting', 'forecast_date = ?', (mdate.isoformat(),)):
            continue
        try:
            # Preferred schema without record_date
            cur.execute(
                "INSERT INTO revenue_forecasting(forecast_date, forecast_value) VALUES(?, ?)",
                (mdate.isoformat(), round(value, 2))
            )
            inserted += 1
        except Exception:
            try:
                # Schema with record_date/predicted_revenue/confidence_level
                cur.execute(
                    "INSERT INTO revenue_forecasting(record_date, forecast_date, predicted_revenue, confidence_level) VALUES(?, ?, ?, ?)",
                    (today_str, mdate.isoformat(), round(value, 2), round(0.6 + random.uniform(-0.05, 0.05), 2))
                )
                inserted += 1
            except Exception:
                pass
    conn.commit()
    print(f"  revenue_forecasting: {inserted} inserted")

def seed_revenue_attribution_daily(conn, start_date: date, end_date: date):
    """Seed revenue_attribution with DAILY data for the full year range"""
    cur = conn.cursor()
    features = ["Chat Recommendations", "Questionnaire Guidance", "Image Analysis", "Routine Planner"]
    weights = [0.42, 0.33, 0.16, 0.09]
    d = start_date
    inserted = 0
    skipped = 0
    
    while d <= end_date:
        date_str = d.isoformat()
        base = random.uniform(20000, 120000)  # INR per day across features
        for feat, w in zip(features, weights):
            # Check if record exists
            if check_exists(cur, "revenue_attribution", "record_date = ? AND ai_feature = ?", (date_str, feat)):
                skipped += 1
                continue
                
            cur.execute(
                "INSERT INTO revenue_attribution(record_date,ai_feature,revenue_amount,percentage) VALUES(?,?,?,?)",
                (date_str, feat, round(base * w * random.uniform(0.92, 1.08), 2), round(w * 100, 1)),
            )
            inserted += 1
        d += timedelta(days=1)
    conn.commit()
    print(f"  revenue_attribution: {inserted} inserted, {skipped} skipped")

def seed_customer_satisfaction(conn, start_date: date, end_date: date):
    """Seed customer satisfaction data with dramatic variations"""
    cur = conn.cursor()
    d = start_date
    inserted = 0
    skipped = 0
    
    # Base satisfaction ratings (out of 5.0)
    base_overall = 4.0
    base_product = 4.2
    base_ai = 4.1
    
    days_passed = 0
    
    while d <= end_date:
        date_str = d.isoformat()
        # Check if record exists
        if check_exists(cur, "customer_satisfaction", "record_date = ?", (date_str,)):
            skipped += 1
            d += timedelta(days=1)
            days_passed += 1
            continue
        
        month = d.month
        day_of_week = d.weekday()
        day_of_month = d.day
        
        # DRAMATIC Seasonal variations
        seasonal_factor = 1.0
        if month == 12:  # December - Holiday excitement
            seasonal_factor = 1.15 + random.uniform(-0.1, 0.15)  # Higher satisfaction!
        elif month == 11:  # November - Pre-holiday
            seasonal_factor = 1.1 + random.uniform(-0.1, 0.1)
        elif month in [1, 2]:  # Post-holiday disappointment
            seasonal_factor = 0.85 + random.uniform(-0.15, 0.1)  # Lower satisfaction
        elif month in [6, 7]:  # Summer - mixed feelings
            seasonal_factor = 0.9 + random.uniform(-0.1, 0.15)
        elif month in [3, 4]:  # Spring renewal
            seasonal_factor = 1.05 + random.uniform(-0.1, 0.15)
        
        # Weekly patterns (weekends have different satisfaction)
        weekly_factor = 1.0
        if day_of_week >= 5:  # Weekend
            weekly_factor = 0.92 + random.uniform(-0.1, 0.12)
        else:  # Weekday
            weekly_factor = 1.05 + random.uniform(-0.08, 0.12)
        
        # Monthly cycle (mid-month typically higher)
        monthly_cycle = 1.0
        if 7 <= day_of_month <= 22:
            monthly_cycle = 1.08 + random.uniform(-0.08, 0.1)
        else:
            monthly_cycle = 0.95 + random.uniform(-0.1, 0.08)
        
        # Big fluctuations
        if days_passed % 7 == 0:  # Weekly swings
            fluctuation = random.uniform(0.85, 1.15)
        elif days_passed % 14 == 0:  # Bi-weekly
            fluctuation = random.uniform(0.88, 1.12)
        elif days_passed % 30 == 0:  # Monthly
            fluctuation = random.uniform(0.8, 1.2)
        elif days_passed % 5 == 0:  # Every 5 days
            fluctuation = random.uniform(0.9, 1.1)
        else:
            fluctuation = 1.0 + random.uniform(-0.12, 0.12)
        
        # Calculate ratings with variations
        overall = base_overall * seasonal_factor * weekly_factor * monthly_cycle * fluctuation
        product = base_product * seasonal_factor * weekly_factor * monthly_cycle * fluctuation * random.uniform(0.95, 1.05)
        ai = base_ai * seasonal_factor * weekly_factor * monthly_cycle * fluctuation * random.uniform(0.92, 1.08)
        
        # Add daily noise
        overall *= random.uniform(0.92, 1.08)
        product *= random.uniform(0.93, 1.07)
        ai *= random.uniform(0.91, 1.09)
        
        # Ensure ratings stay within reasonable bounds (2.5 to 5.0)
        overall = max(2.5, min(5.0, overall))
        product = max(2.5, min(5.0, product))
        ai = max(2.5, min(5.0, ai))
        
        # Special event days
        if day_of_month in [11, 24]:  # Special promotions
            overall *= random.uniform(1.05, 1.15)
            product *= random.uniform(1.03, 1.12)
            ai *= random.uniform(1.04, 1.13)
        elif day_of_month in [1, 15]:  # Start/mid-month dips
            overall *= random.uniform(0.88, 0.98)
            product *= random.uniform(0.90, 0.98)
            ai *= random.uniform(0.89, 0.97)
        
        # Ensure final bounds
        overall = max(2.5, min(5.0, overall))
        product = max(2.5, min(5.0, product))
        ai = max(2.5, min(5.0, ai))
        
        cur.execute(
            "INSERT INTO customer_satisfaction(record_date, overall_satisfaction, product_match_quality, ai_helpfulness) VALUES(?, ?, ?, ?)",
            (date_str, round(overall, 2), round(product, 2), round(ai, 2))
        )
        inserted += 1
        d += timedelta(days=1)
        days_passed += 1
    
    conn.commit()
    print(f"  customer_satisfaction: {inserted} inserted, {skipped} skipped")

def seed_customer_concerns(conn, start_date: date, end_date: date):
    """Seed customer concerns data with varying query counts and success rates"""
    cur = conn.cursor()
    d = start_date
    inserted = 0
    skipped = 0
    
    # Define concern names and categories
    concerns = [
        {'name': 'Acne & Breakouts', 'category': 'skincare'},
        {'name': 'Anti-Aging & Wrinkles', 'category': 'skincare'},
        {'name': 'Dark Spots & Pigmentation', 'category': 'skincare'},
        {'name': 'Sensitive Skin', 'category': 'skincare'},
        {'name': 'Dry & Damaged Hair', 'category': 'haircare'},
        {'name': 'Hair Loss & Thinning', 'category': 'haircare'},
        {'name': 'Oily Skin', 'category': 'skincare'},
        {'name': 'Hair Color Fading', 'category': 'haircare'},
        {'name': 'Uneven Skin Tone', 'category': 'skincare'},
        {'name': 'Dandruff & Scalp Issues', 'category': 'haircare'}
    ]
    
    days_passed = 0
    
    while d <= end_date:
        date_str = d.isoformat()
        month = d.month
        day_of_week = d.weekday()
        
        for concern in concerns:
            # Check if record exists
            if check_exists(cur, "customer_concerns", "record_date = ? AND concern_name = ?", (date_str, concern['name'])):
                continue
            
            # Base query count varies by concern (some are more popular)
            base_queries = {
                'Acne & Breakouts': 3500,
                'Anti-Aging & Wrinkles': 3200,
                'Dark Spots & Pigmentation': 2100,
                'Hair Loss & Thinning': 1700,
                'Dry & Damaged Hair': 1400,
                'Sensitive Skin': 1100,
                'Oily Skin': 900,
                'Hair Color Fading': 800,
                'Uneven Skin Tone': 750,
                'Dandruff & Scalp Issues': 700
            }.get(concern['name'], 500)
            
            # Seasonal variations
            seasonal_factor = 1.0
            if month == 12:  # December - holiday stress
                if 'Acne' in concern['name']:
                    seasonal_factor = random.uniform(1.1, 1.3)
            elif month in [1, 2]:  # New year resolutions
                if 'Anti-Aging' in concern['name'] or 'Hair Loss' in concern['name']:
                    seasonal_factor = random.uniform(1.15, 1.25)
            elif month in [6, 7]:  # Summer - hair care
                if 'hair' in concern['category'].lower():
                    seasonal_factor = random.uniform(1.2, 1.4)
            
            # Weekly patterns
            weekly_factor = 1.0
            if day_of_week >= 5:  # Weekend - more queries
                weekly_factor = random.uniform(1.05, 1.2)
            else:
                weekly_factor = random.uniform(0.9, 1.1)
            
            # Random fluctuations
            fluctuation = random.uniform(0.85, 1.15)
            if days_passed % 7 == 0:
                fluctuation = random.uniform(0.9, 1.25)
            
            query_count = int(base_queries * seasonal_factor * weekly_factor * fluctuation)
            
            # AI success rate varies by concern type (ranges 75% to 94%)
            base_success = {
                'Acne & Breakouts': 89,
                'Anti-Aging & Wrinkles': 92,
                'Dark Spots & Pigmentation': 85,
                'Hair Loss & Thinning': 78,
                'Dry & Damaged Hair': 91,
                'Sensitive Skin': 94,
                'Oily Skin': 87,
                'Hair Color Fading': 82,
                'Uneven Skin Tone': 88,
                'Dandruff & Scalp Issues': 86
            }.get(concern['name'], 85)
            
            # Add variation to success rate
            success_rate = base_success + random.uniform(-5, 5)
            success_rate = max(75, min(100, success_rate))
            
            cur.execute(
                "INSERT INTO customer_concerns(record_date, concern_name, concern_category, query_count, ai_success_rate) VALUES(?, ?, ?, ?, ?)",
                (date_str, concern['name'], concern['category'], query_count, round(success_rate, 2))
            )
            inserted += 1
        
        d += timedelta(days=1)
        days_passed += 1
    
    conn.commit()
    print(f"  customer_concerns: {inserted} inserted, {skipped} skipped")

def seed_customer_lifetime_value(conn, start_date: date, end_date: date):
    """Seed customer lifetime value data with predicted and current CLV"""
    cur = conn.cursor()
    d = start_date
    inserted = 0
    skipped = 0
    
    # Define segment names in order
    segments = ['0-30d', '31-60d', '61-90d', '91-180d', '181-365d', '1-2y', '2y+']
    
    # Base CLV values in thousands (euros)
    base_current = {
        '0-30d': 1200,
        '31-60d': 2000,
        '61-90d': 2800,
        '91-180d': 2600,
        '181-365d': 3800,
        '1-2y': 4800,
        '2y+': 5000
    }
    
    base_predicted = {
        '0-30d': 1800,
        '31-60d': 2800,
        '61-90d': 3800,
        '91-180d': 4200,
        '181-365d': 5200,
        '1-2y': 5800,
        '2y+': 6200
    }
    
    days_passed = 0
    
    while d <= end_date:
        date_str = d.isoformat()
        month = d.month
        
        for segment in segments:
            # Check if record exists
            if check_exists(cur, "customer_lifetime_value", "record_date = ? AND segment_name = ?", (date_str, segment)):
                continue
            
            # Seasonal variations
            seasonal_factor = 1.0
            if month == 12:  # December - higher spending
                seasonal_factor = random.uniform(1.05, 1.15)
            elif month in [1, 2]:  # Post-holiday - lower
                seasonal_factor = random.uniform(0.92, 0.98)
            elif month in [6, 7]:  # Summer - moderate
                seasonal_factor = random.uniform(0.96, 1.05)
            
            # Monthly growth trend
            monthly_growth = 1.0 + (days_passed % 365) / 10000  # Slight upward trend
            
            # Random fluctuations
            fluctuation = random.uniform(0.95, 1.05)
            if days_passed % 30 == 0:
                fluctuation = random.uniform(0.92, 1.08)
            
            current_clv = base_current[segment] * seasonal_factor * monthly_growth * fluctuation
            predicted_clv = base_predicted[segment] * seasonal_factor * monthly_growth * fluctuation
            
            # Ensure predicted is always >= current
            if predicted_clv < current_clv:
                predicted_clv = current_clv * random.uniform(1.1, 1.4)
            
            cur.execute(
                "INSERT INTO customer_lifetime_value(record_date, segment_name, current_clv, predicted_clv) VALUES(?, ?, ?, ?)",
                (date_str, segment, round(current_clv * 1000, 2), round(predicted_clv * 1000, 2))
            )
            inserted += 1
        
        d += timedelta(days=1)
        days_passed += 1
    
    conn.commit()
    print(f"  customer_lifetime_value: {inserted} inserted, {skipped} skipped")

def seed_behavioral_patterns(conn, start_date: date, end_date: date):
    """Seed behavioral patterns data (peak_activity, preference_match, return_rate)"""
    cur = conn.cursor()
    d = start_date
    inserted = 0
    skipped = 0
    
    patterns = [
        {'type': 'peak_activity', 'name': 'Evening (6-9 PM)', 'base': 68.0, 'unit': '%'},
        {'type': 'preference_match', 'name': 'High Match Rate', 'base': 82.0, 'unit': '%'},
        {'type': 'return_rate', 'name': 'Returning Users', 'base': 45.0, 'unit': '%'}
    ]
    
    while d <= end_date:
        date_str = d.isoformat()
        month = d.month
        day_of_week = d.weekday()
        
        for pattern in patterns:
            # Check if record exists
            if check_exists(cur, "behavioral_patterns", "record_date = ? AND pattern_type = ?", (date_str, pattern['type'])):
                continue
            
            # Seasonal variations
            seasonal_factor = 1.0
            if month == 12:  # December - higher activity
                seasonal_factor = random.uniform(1.05, 1.15)
            elif month in [1, 2]:  # Post-holiday - lower
                seasonal_factor = random.uniform(0.90, 0.98)
            elif month in [6, 7]:  # Summer - moderate
                seasonal_factor = random.uniform(0.95, 1.05)
            
            # Weekly patterns
            weekly_factor = 1.0
            if day_of_week >= 5:  # Weekend
                if pattern['type'] == 'peak_activity':
                    weekly_factor = random.uniform(1.1, 1.2)  # More active on weekends
                else:
                    weekly_factor = random.uniform(0.95, 1.05)
            else:  # Weekday
                weekly_factor = random.uniform(0.98, 1.08)
            
            # Random fluctuations
            fluctuation = random.uniform(0.95, 1.05)
            if d.day % 7 == 0:  # Weekly pattern
                fluctuation = random.uniform(0.92, 1.08)
            
            value = pattern['base'] * seasonal_factor * weekly_factor * fluctuation
            value = max(0, min(100, value))  # Keep within 0-100%
            
            cur.execute(
                "INSERT INTO behavioral_patterns(record_date, pattern_type, pattern_name, value, metric_unit) VALUES(?, ?, ?, ?, ?)",
                (date_str, pattern['type'], pattern['name'], round(value, 2), pattern['unit'])
            )
            inserted += 1
        
        d += timedelta(days=1)
    
    conn.commit()
    print(f"  behavioral_patterns: {inserted} inserted, {skipped} skipped")

def seed_ai_performance(conn, start_date: date, end_date: date):
    cur = conn.cursor()
    d = start_date
    # Round to beginning of month
    d = date(d.year, d.month, 1)
    inserted = 0
    skipped = 0
    
    while d <= end_date:
        date_str = d.isoformat()
        # Check if record exists
        # Seed three comparative models per month
        models = [
            ("Baseline v1.0", random.uniform(86, 91), random.randint(1200, 1800)),
            ("Model v2.2", random.uniform(89, 94), random.randint(900, 1500)),
            ("Model v2.3", random.uniform(91, 96), random.randint(700, 1400)),
        ]
        for name, acc, resp in models:
            if check_exists(cur, "ai_model_performance", "record_date = ? AND model_name = ?", (date_str, name)):
                skipped += 1
                continue
            cur.execute(
                "INSERT INTO ai_model_performance(record_date,model_name,accuracy,response_time_ms) VALUES(?,?,?,?)",
                (date_str, name, round(acc, 2), resp),
            )
            inserted += 1
        # Move to next month
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)
    conn.commit()
    print(f"  ai_model_performance: {inserted} inserted, {skipped} skipped")

def seed_product_gaps(conn, start_date: date, end_date: date):
    """Seed product gaps weekly across the range so aggregation by period varies."""
    cur = conn.cursor()
    # Base rows
    base = [
        ("Sulfate-Free Shampoo for Color-Treated Hair", "haircare", 900, 36000),
        ("Overnight Sleeping Mask", "skincare", 760, 30000),
        ("Scalp Treatment Serum", "haircare", 640, 32000),
        ("Waterproof Mascara for Sensitive Eyes", "makeup", 520, 15500),
        ("Body Acne Treatment Spray", "skincare", 410, 16500),
        ("Fragrance-Free Moisturizer", "skincare", 395, 14900),
        ("Tinted Mineral Sunscreen SPF 50", "skincare", 380, 22000),
        ("Curl-Defining Leave-In Cream", "haircare", 360, 13000),
        ("Brightening Eye Serum", "skincare", 340, 14000),
        ("Hydrating Lip Treatment Balm", "makeup", 330, 9800),
    ]
    d = start_date
    inserted = 0
    random.seed(7)
    while d <= end_date:
        date_str = d.isoformat()
        # Apply variation per week
        for idx, (name, cat, req, rev) in enumerate(base, start=1):
            # Skip if exists for this date+product
            if check_exists(cur, "product_gaps", "record_date = ? AND product_name = ?", (date_str, name)):
                continue
            demand = int(req * random.uniform(0.85, 1.15))
            potential = float(rev) * random.uniform(0.9, 1.1)
            cur.execute(
                """
                INSERT INTO product_gaps(record_date, gap_rank, product_name, category, demand_score, potential_revenue)
                VALUES(?,?,?,?,?,?)
                """,
                (date_str, idx, name, cat, demand, round(potential, 2))
            )
            inserted += 1
        d += timedelta(days=7)
    conn.commit()
    print(f"  product_gaps: {inserted} inserted")

def seed_category_perf(conn, start_date: date, end_date: date):
    """Seed category_performance monthly so we can derive cross-sell/upsell."""
    cur = conn.cursor()
    categories = [
        'Skincare Sets', 'Anti-Aging', 'Haircare Bundles', 'Makeup Kits', 'Acne Treatment', 'Sensitive Skin'
    ]
    # Round start to month start
    d = date(start_date.year, start_date.month, 1)
    inserted = 0
    random.seed(21)
    while d <= end_date:
        for cat in categories:
            date_str = d.isoformat()
            if check_exists(cur, 'category_performance', 'record_date = ? AND category_name = ?', (date_str, cat)):
                continue
            total_products = random.randint(15, 60)
            views = random.randint(2000, 15000)
            total_revenue = random.uniform(80000, 600000)  # INR per month per category
            avg_conv = random.uniform(1.5, 5.0)  # %
            ai_rate = random.uniform(15.0, 35.0)  # % of views driven by AI
            cur.execute(
                """
                INSERT INTO category_performance(record_date, category_name, total_products, total_views, total_revenue, avg_conversion_rate, ai_recommendation_rate)
                VALUES(?,?,?,?,?,?,?)
                """,
                (date_str, cat, total_products, views, round(total_revenue, 2), round(avg_conv, 2), round(ai_rate, 2))
            )
            inserted += 1
        # next month
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)
    conn.commit()
    print(f"  category_performance: {inserted} inserted")

def seed_product_analytics(conn, start_date: date, end_date: date):
    """Seed product_analytics daily for a handful of products."""
    cur = conn.cursor()
    products = [
        ('prod-retinol-serum', 'Anti-Aging Retinol Serum', 'Skincare'),
        ('prod-hyaluronic-set', 'Hydrating Hyaluronic Acid Set', 'Skincare'),
        ('prod-vitc-kit', 'Vitamin C Brightening Kit', 'Skincare'),
        ('prod-hair-repair', 'Hair Growth & Repair Bundle', 'Haircare'),
        ('prod-matte-lipstick', 'Matte Lipstick Collection', 'Makeup')
    ]
    d = start_date
    random.seed(11)
    inserted = 0
    while d <= end_date:
        date_str = d.isoformat()
        for pid, name, category in products:
            if check_exists(cur, 'product_analytics', 'record_date = ? AND product_name = ?', (date_str, name)):
                continue
            recs = random.randint(20, 90)
            conv = random.uniform(10.0, 30.0)  # %
            purchases = int(recs * (conv / 100.0))
            price = random.uniform(200.0, 2000.0)  # INR
            revenue = purchases * price
            cur.execute(
                """
                INSERT INTO product_analytics(record_date, product_id, product_name, category, views, ai_recommendations, purchases, revenue, conversion_rate)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (date_str, pid, name, category, recs * 3, recs, purchases, round(revenue, 2), round(conv, 2))
            )
            inserted += 1
        d += timedelta(days=1)
    conn.commit()
    print(f"  product_analytics: {inserted} inserted")

def seed_realtime_metrics(conn):
    """Seed minute-level realtime metrics for the last ~2 hours so the realtime page has data.

    The function is schema-aware: if columns (api_success_rate, daily_api_calls, error_rate_pct)
    exist, it will populate them too.
    """
    cur = conn.cursor()
    now = datetime.utcnow()
    # Determine available columns
    cur.execute("PRAGMA table_info(realtime_metrics)")
    cols = {r[1] for r in cur.fetchall()}
    inserted = 0
    for i in range(120, -1, -1):
        ts = (now - timedelta(minutes=i)).replace(second=0, microsecond=0)
        tstr = ts.isoformat()
        if check_exists(cur, "realtime_metrics", "recorded_at = ?", (tstr,)):
            continue
        # Generate plausible metrics with gentle waves
        active = int(70 + 20 * (1 + (i % 30) / 30) + random.uniform(-8, 8))
        api_ms = int(120 + 30 * (0.5 + (i % 20) / 20) + random.uniform(-8, 8))
        cpu = round(35 + 20 * (0.5 + (i % 25) / 25) + random.uniform(-3, 3), 2)
        mem = round(52 + 10 * (0.5 + (i % 40) / 40) + random.uniform(-2, 2), 2)
        conv = int(3 + 4 * (0.5 + (i % 60) / 60) + random.uniform(-1, 2))

        # Optional derived metrics
        success = max(95.0, min(99.9, 99.9 - (api_ms/1000.0) * 5.0))
        daily_calls = int(max(5000, min(50000, conv * 60 * 24 * 0.8)))
        err_rate = max(0.0, 100.0 - success)

        # Build dynamic insert based on available columns
        values = {
            'recorded_at': tstr,
            'active_sessions': active,
            'api_response_time_ms': api_ms,
            'cpu_usage_pct': cpu,
            'memory_usage_pct': mem,
            'conversions_per_min': conv,
            'api_success_rate': round(success, 2),
            'daily_api_calls': daily_calls,
            'error_rate_pct': round(err_rate, 2)
        }
        ordered = [
            'recorded_at','active_sessions','api_response_time_ms','cpu_usage_pct','memory_usage_pct','conversions_per_min',
            'api_success_rate','daily_api_calls','error_rate_pct'
        ]
        use_cols = [c for c in ordered if c in cols]
        placeholders = ','.join(['?']*len(use_cols))
        sql = f"INSERT INTO realtime_metrics({','.join(use_cols)}) VALUES({placeholders})"
        cur.execute(sql, tuple(values[c] for c in use_cols))
        inserted += 1
    conn.commit()
    print(f"  realtime_metrics: {inserted} inserted")

def seed_api_endpoints(conn):
    """Seed api_endpoints table with a few representative services and health stats."""
    cur = conn.cursor()
    cur.execute("DELETE FROM api_endpoints")
    now = datetime.utcnow().isoformat()
    # Discover actual columns to satisfy NOT NULL constraints
    cur.execute("PRAGMA table_info(api_endpoints)")
    pragma = cur.fetchall()
    table_cols = [r[1] for r in pragma]

    seed_items = [
        {
            'endpoint_name': 'Customer API',
            'base_url': 'https://demo-ecommerce.com/api/customers',
            'method': 'GET',
            'avg_response_ms': 120,
            'success_rate': 99.3,
            'daily_calls': 14500,
            'error_rate': 0.7,
            'last_checked': now,
            'status': 'active'
        },
        {
            'endpoint_name': 'Product API',
            'base_url': 'https://demo-ecommerce.com/api/products',
            'method': 'GET',
            'avg_response_ms': 110,
            'success_rate': 99.5,
            'daily_calls': 12800,
            'error_rate': 0.5,
            'last_checked': now,
            'status': 'active'
        },
        {
            'endpoint_name': 'Order API',
            'base_url': 'https://demo-ecommerce.com/api/orders',
            'method': 'GET',
            'avg_response_ms': 130,
            'success_rate': 99.1,
            'daily_calls': 16200,
            'error_rate': 0.9,
            'last_checked': now,
            'status': 'active'
        },
        {
            'endpoint_name': 'Analytics API',
            'base_url': 'https://demo-ecommerce.com/api/analytics',
            'method': 'GET',
            'avg_response_ms': 150,
            'success_rate': 98.7,
            'daily_calls': 9200,
            'error_rate': 1.3,
            'last_checked': now,
            'status': 'active'
        }
    ]
    # Choose an insertion column order based on existing schema
    preferred = ['endpoint_name','base_url','method','avg_response_ms','success_rate','daily_calls','error_rate','last_checked','status']
    use_cols = [c for c in preferred if c in table_cols]
    placeholders = ','.join(['?']*len(use_cols))
    sql = f"INSERT INTO api_endpoints({','.join(use_cols)}) VALUES({placeholders})"
    values = [tuple(item.get(c, None) for c in use_cols) for item in seed_items]
    cur.executemany(sql, values)
    conn.commit()
    print("  api_endpoints: seeded")

def seed_billing_and_usage(conn):
    cur = conn.cursor()
    # Clear existing to avoid duplicates
    cur.execute("DELETE FROM billing_summary")
    # Insert one summary row
    # Build dynamic insert to satisfy existing schemas that may have NOT NULL columns (e.g., billing_period_start)
    cur.execute("PRAGMA table_info(billing_summary)")
    pragma_rows = cur.fetchall()
    bs_cols = [r[1] for r in pragma_rows]
    values = {
        'plan_name': 'Professional Plan',
        'monthly_price': 15000.0,
        'renewal_date': (datetime.utcnow() + timedelta(days=15)).date().isoformat(),
        'subscription_amount': 15000.0,
        'chat_amount': 0.0,
        'image_amount': 0.0,
        'questionnaire_amount': 0.0,
        'overage_amount': 10.95,
        'total_estimated': 1010.95,
        # Provide defaults for common extra columns if they exist
        'billing_period_start': datetime.utcnow().date().replace(day=1).isoformat(),
        'billing_period_end': (datetime.utcnow().date().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat(),
        'status': 'Active'
    }
    # Satisfy any NOT NULL columns that aren't in our defaults
    # PRAGMA columns: (cid, name, type, notnull, dflt_value, pk)
    for cid, name, coltype, notnull, dflt, pk in pragma_rows:
        if name not in values and notnull:
            # Provide reasonable defaults based on type/name
            t = (coltype or '').upper()
            if 'REAL' in t or 'INT' in t or 'NUM' in t:
                if name.lower() in ('base_cost', 'subscription_amount'):
                    values[name] = values.get('monthly_price', 0.0)
                else:
                    values[name] = 0.0
            else:
                # TEXT defaults
                if name.lower().endswith('start'):
                    values[name] = datetime.utcnow().date().replace(day=1).isoformat()
                elif name.lower().endswith('end'):
                    values[name] = (datetime.utcnow().date().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()
                elif name.lower() == 'status':
                    values[name] = 'Active'
                else:
                    values[name] = ''

    cols_to_use = [c for c in values.keys() if c in bs_cols]
    placeholders = ','.join(['?']*len(cols_to_use))
    sql = f"INSERT INTO billing_summary({','.join(cols_to_use)}) VALUES({placeholders})"
    cur.execute(sql, tuple(values[c] for c in cols_to_use))
    # Usage breakdown for last 6 months for four types
    types = [
        ('chat', 800, '₹0.50 per chat after limit'),
        ('image', 300, '₹1.00 per image after limit'),
        ('questionnaire', 1500, '₹0.25 per questionnaire after limit'),
        ('routine', 120, '₹3.00 per routine after limit')
    ]
    today = datetime.utcnow().date().replace(day=1)
    for m in range(5, -1, -1):
        month_date = (today - timedelta(days=30*m)).isoformat()
        for t, limit, rate in types:
            used = int(limit * (0.55 + 0.15 * (m % 3)))
            overage_cost = '₹0.00'
            if t == 'routine' and used > limit:
                overage_cost = '₹799.00'
            # Insert with both legacy (month) and alternate schema (record_date)
            cur.execute("PRAGMA table_info(usage_breakdown)")
            ub_cols = {r[1] for r in cur.fetchall()}
            values = {
                'month': month_date,
                'record_date': month_date,
                'usage_type': t,
                'service_name': t.capitalize(),
                'used': used,
                'free_limit': limit,
                'overage_rate': rate,
                'overage_cost': overage_cost,
                'total_usage': used
            }
            cols = [c for c in ['month','record_date','usage_type','service_name','used','free_limit','overage_rate','overage_cost','total_usage'] if c in ub_cols]
            sql = f"INSERT INTO usage_breakdown({','.join(cols)}) VALUES({','.join(['?']*len(cols))})"
            cur.execute(sql, tuple(values[c] for c in cols))
    # Payments seed
    cur.execute("DELETE FROM billing_payments")
    payments = [
        ( (today - timedelta(days=0)).isoformat(), 'Professional Plan + Overages', 15799.00, 'Paid', ''),
        ( (today - timedelta(days=30)).isoformat(), 'Professional Plan + Overages', 15849.00, 'Paid', ''),
        ( (today - timedelta(days=60)).isoformat(), 'Professional Plan', 15000.00, 'Paid', ''),
    ]
    cur.executemany(
        "INSERT INTO billing_payments(payment_date, description, amount, status, invoice_url) VALUES(?,?,?,?,?)",
        payments
    )
    # Alerts
    cur.execute("DELETE FROM usage_alerts")
    alerts = [
        ('warning', 'Image Analysis nearing limit', 'You\'ve used 92% of your monthly image analysis quota (276/300)', (datetime.utcnow()-timedelta(hours=2)).isoformat()),
        ('error', 'Routine Plans exceeded limit', 'You\'ve exceeded your monthly routine plan quota. Additional charges: ₹799.00', (datetime.utcnow()-timedelta(days=1)).isoformat()),
        ('info', 'Monthly billing cycle starts tomorrow', 'Your next billing cycle begins soon.', (datetime.utcnow()-timedelta(days=1)).isoformat())
    ]
    cur.executemany("INSERT INTO usage_alerts(level, title, message, created_at) VALUES(?,?,?,?)", alerts)
    conn.commit()
    print("  billing_summary/usage_breakdown/payments/alerts: seeded")

def seed_api_configurations(conn):
    """Seed api_configurations table with demo API connection statuses"""
    cur = conn.cursor()
    # Clear existing to avoid duplicates
    cur.execute("DELETE FROM api_configurations")
    
    now = datetime.utcnow()
    # Calculate last sync times for different statuses
    customers_last_sync = (now - timedelta(minutes=5)).isoformat()  # 5 minutes ago
    products_last_sync = (now - timedelta(hours=2)).isoformat()  # 2 hours ago
    orders_last_sync = (now - timedelta(minutes=10)).isoformat()  # 10 minutes ago
    
    # Seed API configurations with different statuses
    configs = [
        {
            'api_type': 'customers',
            'api_name': 'Customer Data API',
            'api_url': 'https://demo-ecommerce.com/api/customers',
            'api_key': 'demo_customer_key_123',
            'status': 'active',  # Will display as "Connected"
            'last_sync': customers_last_sync,
            'sync_frequency': '5 minutes'
        },
        {
            'api_type': 'products',
            'api_name': 'Product Catalog API',
            'api_url': 'https://demo-ecommerce.com/api/products',
            'api_key': 'demo_product_key_456',
            'status': 'active',  # Will display as "Connected"
            'last_sync': products_last_sync,
            'sync_frequency': '1 hour'
        },
        {
            'api_type': 'orders',
            'api_name': 'Order Data API',
            'api_url': 'https://demo-ecommerce.com/api/orders',
            'api_key': 'demo_order_key_789',
            'status': 'rate_limited',  # Will display as "Rate Limited" with warning
            'last_sync': orders_last_sync,
            'sync_frequency': '10 minutes'
        },
        {
            'api_type': 'analytics',
            'api_name': 'User Behavior Analytics API',
            'api_url': 'https://demo-ecommerce.com/api/analytics',
            'api_key': None,  # Not configured
            'status': 'not configured',  # Will display as "Not Configured"
            'last_sync': None,  # Never synced
            'sync_frequency': None
        }
    ]
    
    # Insert configurations
    for config in configs:
        cur.execute("""
            INSERT INTO api_configurations 
            (api_type, api_name, api_url, api_key, status, last_sync, sync_frequency, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            config['api_type'],
            config['api_name'],
            config['api_url'],
            config['api_key'],
            config['status'],
            config['last_sync'],
            config['sync_frequency'],
            now.isoformat(),
            now.isoformat()
        ))
    
    conn.commit()
    print("  api_configurations: seeded")

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    ensure_tables(conn)

    # Clear recent demo rows (last year + buffer)
    print("Clearing recent demo data...")
    clear_recent_demo(conn, days=370)

    today = date.today()
    start_1y = today - timedelta(days=365)

    print(f"Seeding data from {start_1y} to {today}...")
    print("=" * 60)
    
    # Seed across a full year
    seed_overview_kpis(conn, start_1y, today)
    seed_conversion_funnel(conn, start_1y, today)
    seed_interaction_types(conn, start_1y, today)
    seed_conversion_trends(conn, start_1y, today)  # Daily data for full year
    seed_customer_segments(conn, start_1y, today)
    seed_interaction_summary(conn, start_1y, today)
    # Seed attribution first so monthly summary can derive from it
    seed_revenue_attribution_daily(conn, start_1y, today)  # DAILY attribution for full year
    seed_revenue_summary(conn, start_1y, today)  # Monthly summaries derived from attribution
    seed_revenue_forecasting(conn)  # Forecast next 6 months from summary
    seed_ai_performance(conn, start_1y, today)
    seed_customer_satisfaction(conn, start_1y, today)  # Daily satisfaction data for full year
    seed_customer_concerns(conn, start_1y, today)  # Daily concerns data
    seed_customer_lifetime_value(conn, start_1y, today)  # Daily CLV data
    seed_behavioral_patterns(conn, start_1y, today)  # Daily behavioral patterns data
    seed_product_gaps(conn, start_1y, today)
    seed_category_perf(conn, start_1y, today)
    seed_product_analytics(conn, start_1y, today)
    seed_realtime_metrics(conn)
    seed_api_endpoints(conn)
    seed_billing_and_usage(conn)
    seed_api_configurations(conn)
    
    print("=" * 60)
    print("[OK] Demo data seeded for 7/30/90/365-day ranges with duplicate checking.")
    
    # Verify data ranges
    cur = conn.cursor()
    cur.execute("SELECT MIN(record_date), MAX(record_date), COUNT(*) FROM conversion_trends")
    ct_row = cur.fetchone()
    print(f"Conversion trends: {ct_row[2]} records from {ct_row[0]} to {ct_row[1]}")
    
    cur.execute("SELECT MIN(record_date), MAX(record_date), COUNT(*) FROM revenue_attribution")
    ra_row = cur.fetchone()
    print(f"Revenue attribution: {ra_row[2]} records from {ra_row[0]} to {ra_row[1]}")
    
    cur.execute("SELECT MIN(record_date), MAX(record_date), COUNT(*) FROM overview_kpis")
    kpi_row = cur.fetchone()
    print(f"Overview KPIs: {kpi_row[2]} records from {kpi_row[0]} to {kpi_row[1]}")
    
    conn.close()

if __name__ == "__main__":
    main()
