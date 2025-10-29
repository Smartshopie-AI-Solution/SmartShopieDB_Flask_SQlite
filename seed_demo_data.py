import sqlite3
from datetime import datetime, timedelta, date
import random

DB_PATH = "smartshopie_dashboard.db"

def ensure_tables(conn):
    # no-op: assumes database_schema.sql already applied
    pass

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
        ("ai_model_performance", "record_date"),
        ("customer_satisfaction", "record_date"),
        ("customer_concerns", "record_date"),
        ("customer_lifetime_value", "record_date"),
        ("behavioral_patterns", "record_date"),
    ]
    for table, col in tables_with_date:
        cur.execute(f"DELETE FROM {table} WHERE DATE({col}) >= DATE(?)", (since,))
    conn.commit()

def check_exists(cur, table, where_clause, params):
    """Check if a record exists matching the WHERE clause"""
    query = f"SELECT COUNT(*) FROM {table} WHERE {where_clause}"
    cur.execute(query, params)
    return cur.fetchone()[0] > 0

def seed_overview_kpis(conn, start_date: date, end_date: date):
    cur = conn.cursor()
    d = start_date
    customers = 10000
    ai_interactions = 20000
    revenue = 800000.0
    inserted = 0
    skipped = 0
    while d <= end_date:
        date_str = d.isoformat()
        # Check if record exists for this date
        if check_exists(cur, "overview_kpis", "record_date = ?", (date_str,)):
            skipped += 1
            d += timedelta(days=1)
            continue
            
        growth = random.uniform(-0.5, 1.5)
        customers = max(1000, int(customers * (1 + growth/100)))
        conv_rate = max(5.0, min(40.0, 20.0 + random.uniform(-3, 3)))
        ai_interactions = max(1000, int(ai_interactions * (1 + random.uniform(-1, 1)/100)))
        revenue = max(100000.0, revenue * (1 + random.uniform(-1, 2)/100))
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
        base = random.randint(8000, 20000)
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
        total = random.randint(15000, 40000)
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
    base_conversion_rate = 15.0
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
        daily_visitors = random.randint(9500, 12500)
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

def seed_customer_segments(conn, sample_date: date):
    cur = conn.cursor()
    segments = [
        ("New Visitors", 3500, 15.0, 45.0),
        ("Returning Customers", 2800, 38.0, 62.0),
        ("Occasional Users", 1900, 22.0, 38.0),
        ("Loyalists", 1200, 68.0, 95.0),
    ]
    date_str = sample_date.isoformat()
    inserted = 0
    skipped = 0
    for name, size, clv, aov in segments:
        # Check if record exists
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
            d += timedelta(days=7)
            continue
            
        total = random.randint(15000, 40000)
        chat = int(total * random.uniform(0.35, 0.5))
        questionnaire = int(total * random.uniform(0.25, 0.4))
        image = int(total * random.uniform(0.1, 0.2))
        routine = max(0, total - chat - questionnaire - image)
        avg_resp = random.uniform(120, 420)  # seconds
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
        d += timedelta(days=7)
    conn.commit()
    print(f"  interaction_summary: {inserted} inserted, {skipped} skipped")

def seed_revenue_summary(conn, start_date: date, end_date: date):
    """Seed revenue_summary table - monthly records"""
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
            
        total_revenue_impact = random.uniform(600000, 1600000)
        aov = random.uniform(120, 260)
        aov_with_ai = aov * random.uniform(1.1, 1.4)
        aov_improvement = ((aov_with_ai - aov) / max(aov, 1)) * 100.0
        investment = 25000.0
        monthly_return = total_revenue_impact / 12.0
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
        base = random.uniform(500000, 1200000)
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
        if check_exists(cur, "ai_model_performance", "record_date = ? AND model_name = ?", (date_str, "Model v2.3")):
            skipped += 1
            # Move to next month
            if d.month == 12:
                d = date(d.year + 1, 1, 1)
            else:
                d = date(d.year, d.month + 1, 1)
            continue
            
        accuracy = random.uniform(90, 97)
        response_ms = random.randint(700, 1400)
        cur.execute(
            "INSERT INTO ai_model_performance(record_date,model_name,accuracy,response_time_ms) VALUES(?,?,?,?)",
            (date_str, "Model v2.3", round(accuracy, 2), response_ms),
        )
        inserted += 1
        # Move to next month
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)
    conn.commit()
    print(f"  ai_model_performance: {inserted} inserted, {skipped} skipped")

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
    seed_customer_segments(conn, today - timedelta(days=14))
    seed_interaction_summary(conn, start_1y, today)
    seed_revenue_summary(conn, start_1y, today)  # Monthly summaries
    seed_revenue_attribution_daily(conn, start_1y, today)  # DAILY attribution for full year
    seed_ai_performance(conn, start_1y, today)
    seed_customer_satisfaction(conn, start_1y, today)  # Daily satisfaction data for full year
    seed_customer_concerns(conn, start_1y, today)  # Daily concerns data
    seed_customer_lifetime_value(conn, start_1y, today)  # Daily CLV data
    seed_behavioral_patterns(conn, start_1y, today)  # Daily behavioral patterns data
    
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
