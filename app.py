"""
SmartShopie AI - Client Analytics Dashboard Backend
Flask application to serve the dashboard and provide API endpoints
"""

from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
from smartshopie_db import SmartShopieDB
from datetime import datetime, timedelta
import sqlite3
import threading

app = Flask(__name__, 
            static_folder='assets',
            template_folder='.')
CORS(app)

# Initialize database with thread-local storage for thread safety
class ThreadSafeDB:
    def __init__(self, db_path):
        self.db_path = db_path
        self._local = threading.local()
    
    def get_connection(self):
        if not hasattr(self._local, 'connection'):
            self._local.connection = sqlite3.connect(self.db_path, check_same_thread=False)
            self._local.connection.row_factory = sqlite3.Row
        return self._local.connection
    
    def execute_query(self, query, params=()):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        return results

db = ThreadSafeDB("smartshopie_dashboard.db")

# Helper function to get date range based on period string
def get_date_range(period):
    """Convert period string to date range tuple (start_date, end_date)"""
    today = datetime.now().date()
    if period == '7d':
        start_date = today - timedelta(days=7)
    elif period == '30d':
        start_date = today - timedelta(days=30)
    elif period == '90d':
        start_date = today - timedelta(days=90)
    elif period == '1y':
        start_date = today - timedelta(days=365)
    else:
        start_date = today - timedelta(days=30)  # Default to 30 days
    
    return (start_date.isoformat(), today.isoformat())

def get_period_from_request():
    """Extract date range period from request, default to 30d"""
    period = request.args.get('period', '30d')
    return get_date_range(period)

# ============================================================
# ROUTES - Dashboard Pages
# ============================================================

@app.route('/')
def index():
    """Serve the main dashboard page"""
    print("\n[SERVER] Dashboard page requested", flush=True)
    import sys
    sys.stdout.flush()
    return render_template('dashboard.html')

@app.route('/assets/<path:filename>')
def assets(filename):
    """Serve static assets from assets directory"""
    import urllib.parse
    import os
    filename = urllib.parse.unquote(filename)
    
    assets_dir = 'assets'
    file_path = os.path.join(assets_dir, filename)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(assets_dir, filename)
    
    # If not found, return 404
    print(f"[WARNING] File not found: {filename}", flush=True)
    return "File not found", 404

# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/api/test-assets')
def test_assets():
    """Test if assets can be served"""
    import os
    static_dir = 'SmartShopie AI - Client Analytics Dashboard_files'
    files = os.listdir(static_dir) if os.path.exists(static_dir) else []
    return jsonify({
        'static_dir_exists': os.path.exists(static_dir),
        'files': files,
        'dashboard_css_exists': os.path.exists(os.path.join(static_dir, 'dashboard.css')),
        'dashboard_js_exists': os.path.exists(os.path.join(static_dir, 'dashboard.js.download'))
    })

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    print("[SERVER] Health check requested", flush=True)
    import sys
    sys.stdout.flush()
    return jsonify({'status': 'healthy', 'database': 'connected'})

@app.route('/api/overview/kpis')
def get_overview_kpis():
    """Get overview KPI data aggregated by selected date range.

    Design:
    - total_customers: MAX over range (represents latest total in period)
    - total_customers_change: AVG over range
    - conversion_rate: AVG over range
    - conversion_rate_change: AVG over range
    - ai_interactions: SUM over range
    - ai_interactions_change: AVG over range
    - revenue_impact: SUM over range
    - revenue_impact_change: AVG over range
    """
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        # Force output to show in terminal
        print(f"\n[API] /api/overview/kpis called with period={period}, range={start_date} to {end_date}", flush=True)
        import sys
        sys.stdout.flush()

        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Debug: Check what data exists in the range
        cursor.execute(
            """SELECT COUNT(*), MIN(record_date), MAX(record_date), 
                      SUM(ai_interactions), SUM(revenue_impact)
               FROM overview_kpis 
               WHERE record_date BETWEEN ? AND ?""",
            (start_date, end_date)
        )
        debug_row = cursor.fetchone()
        debug_msg = f"[DEBUG] Period {period}: Found {debug_row[0]} records, date range {debug_row[1]} to {debug_row[2]}, ai_interactions sum = {debug_row[3]}, revenue sum = {debug_row[4]}"
        print(debug_msg, flush=True)
        import sys; sys.stdout.flush()
        
        cursor.execute(
            """SELECT 
                    MAX(total_customers) as total_customers,
                    AVG(total_customers_change) as total_customers_change,
                    AVG(conversion_rate) as conversion_rate,
                    AVG(conversion_rate_change) as conversion_rate_change,
                    SUM(CAST(ai_interactions AS INTEGER)) as ai_interactions,
                    AVG(ai_interactions_change) as ai_interactions_change,
                    SUM(CAST(revenue_impact AS REAL)) as revenue_impact,
                    AVG(revenue_impact_change) as revenue_impact_change
               FROM overview_kpis
               WHERE record_date BETWEEN ? AND ?""",
            (start_date, end_date)
        )
        row = cursor.fetchone()
        cursor.close()
        
        debug_msg2 = f"[DEBUG] Period {period}: Aggregated results - ai_interactions={row[4] if row else None}, revenue={row[6] if row else None}"
        print(debug_msg2, flush=True)
        import sys; sys.stdout.flush()

        if row and any(v is not None for v in row):
            result = {
                'total_customers': int(row[0] or 0),
                'total_customers_change': float(row[1] or 0),
                'conversion_rate': float(row[2] or 0),
                'conversion_rate_change': float(row[3] or 0),
                'ai_interactions': int(row[4] or 0),
                'ai_interactions_change': float(row[5] or 0),
                'revenue_impact': float(row[6] or 0),
                'revenue_impact_change': float(row[7] or 0),
            }
            debug = {
                'period': period,
                'date_range': f'{start_date} to {end_date}',
                'aggregation': 'MAX/AVG/SUM mix'
            }
            result['_debug'] = debug
            return jsonify({'success': True, 'data': result, '_debug': debug})

        return jsonify({
            'success': False,
            'message': f'No KPI data found for period {period} ({start_date} to {end_date})'
        }), 404
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/overview/funnel')
def get_conversion_funnel():
    """Get conversion funnel data with date range filtering - aggregated"""
    try:
        start_date, end_date = get_period_from_request()
        # Aggregate by stage within the date range - ensure we get only one result per stage
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT 
                stage_name, 
                stage_order,
                CAST(SUM(CAST(count AS INTEGER)) AS INTEGER) as count,
                AVG(percentage) as percentage,
                AVG(dropoff_rate) as dropoff_rate
               FROM conversion_funnel 
               WHERE record_date BETWEEN ? AND ?
               GROUP BY stage_name, stage_order
               ORDER BY stage_order""",
            (start_date, end_date)
        )
        rows = cursor.fetchall()
        cursor.close()
        
        period = request.args.get('period', '30d')
        
        # Convert to proper format - ensure we only have one result per stage
        result = []
        seen_stages = set()
        for row in rows:
            stage_order = row[1]
            if stage_order not in seen_stages:
                seen_stages.add(stage_order)
                result.append({
                    'stage_name': row[0],
                    'stage_order': stage_order,
                    'count': int(row[2] or 0),
                    'stage_count': int(row[2] or 0),
                    'percentage': float(row[3] or 0),
                    'dropoff_rate': float(row[4] or 0)
                })
        
        # Only return fallback if we have NO data at all in the date range
        if not rows:
            # Try to get latest complete funnel as last resort
            cursor = conn.cursor()
            cursor.execute(
                """SELECT stage_name, stage_order, count, percentage, dropoff_rate
                   FROM conversion_funnel 
                   WHERE record_date = (SELECT MAX(record_date) FROM conversion_funnel)
                   ORDER BY stage_order
                   LIMIT 5"""
            )
            fallback_rows = cursor.fetchall()
            cursor.close()
            
            if fallback_rows:
                result = []
                for row in fallback_rows:
                    result.append({
                        'stage_name': row[0],
                        'stage_order': row[1],
                        'count': int(row[2] or 0),
                        'stage_count': int(row[2] or 0),
                        'percentage': float(row[3] or 0),
                        'dropoff_rate': float(row[4] or 0)
                    })
                # Add debug info indicating this is fallback data
                return jsonify({
                    'success': True, 
                    'data': result,
                    '_debug': {
                        'period': period,
                        'date_range': f'{start_date} to {end_date}',
                        'used_fallback': True,
                        'fallback_date': fallback_rows[0][0] if fallback_rows else None
                    }
                })
            else:
                return jsonify({
                    'success': False, 
                    'message': f'No funnel data found for period {period} ({start_date} to {end_date})'
                }), 404
        
        # Ensure we have exactly 5 stages (0-4), if not, it's an issue with data
        if len(result) < 5:
            return jsonify({
                'success': False, 
                'message': f'Incomplete funnel data for period {period} (found {len(result)}/5 stages)'
            }), 404
        
        debug_info = {
                'period': period,
                'date_range': f'{start_date} to {end_date}',
                'stages_count': len(result),
                'used_fallback': False
        }
        response = { 'success': True, 'data': result, '_debug': debug_info }
        return jsonify(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/overview/interaction-types')
def get_interaction_types():
    """Get interaction types with date range filtering - aggregated"""
    try:
        start_date, end_date = get_period_from_request()
        # Use direct SQL execution to ensure proper aggregation
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT 
                interaction_name,
                CAST(SUM(CAST(count AS INTEGER)) AS INTEGER) as count,
                AVG(percentage) as percentage
               FROM interaction_types 
               WHERE record_date BETWEEN ? AND ?
               GROUP BY interaction_name
               ORDER BY count DESC""",
            (start_date, end_date)
        )
        rows = cursor.fetchall()
        cursor.close()
        
        if not rows:
            # Fallback: get latest data
            cursor = conn.cursor()
            cursor.execute(
                """SELECT interaction_name, count, percentage
                   FROM interaction_types 
                   WHERE record_date = (SELECT MAX(record_date) FROM interaction_types)
                   ORDER BY count DESC"""
            )
            rows = cursor.fetchall()
            cursor.close()
        
        # Convert to proper format - ensure no duplicates
        result = []
        seen_names = set()
        total = 0
        for row in rows:
            name = row[0]
            if name not in seen_names:
                seen_names.add(name)
                count = int(row[1] or 0)
                pct = float(row[2] or 0) if len(row) > 2 else 0.0
                total += count
                result.append({
                    'interaction_name': name,
                    'interaction_type': name,  # For compatibility
                    'count': count,
                    'percentage': round(pct, 1) if pct > 0 else 0
                })
        
        # Recalculate percentages if missing or incorrect
        if total > 0:
            for item in result:
                if item['percentage'] == 0:
                    item['percentage'] = round((item['count'] / total) * 100, 1)
        
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/conversions/analytics')
def get_conversion_analytics():
    """Get conversion analytics"""
    try:
        data = db.execute_query(
            "SELECT * FROM conversion_analytics ORDER BY record_date DESC LIMIT 1"
        )
        return jsonify({'success': True, 'data': data[0] if data else None})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/conversions/trends')
def get_conversion_trends():
    """Get conversion trends with date range filtering - aggregate for longer periods"""
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # For 1-year view, aggregate by month to reduce data points
        if period == '1y':
            cursor.execute(
                """SELECT 
                    date(ct.record_date, 'start of month') as month_start,
                    SUM(ct.conversions) as conversions,
                    SUM(ct.ai_attributed_conversions) as ai_attributed_conversions,
                    AVG(CASE 
                        WHEN o.total_customers > 0 THEN (ct.conversions * 100.0 / o.total_customers)
                        ELSE 0 
                    END) as conversion_rate
                   FROM conversion_trends ct
                   LEFT JOIN overview_kpis o ON DATE(ct.record_date) = DATE(o.record_date)
                   WHERE ct.record_date BETWEEN ? AND ?
                   GROUP BY date(ct.record_date, 'start of month')
                   ORDER BY month_start ASC""",
                (start_date, end_date)
            )
        elif period == '90d':
            # For 90d, group by week
            cursor.execute(
                """SELECT 
                    date(ct.record_date, '-' || ((strftime('%w', ct.record_date) + 6) % 7) || ' days') as week_start,
                    SUM(ct.conversions) as conversions,
                    SUM(ct.ai_attributed_conversions) as ai_attributed_conversions,
                    AVG(CASE 
                        WHEN o.total_customers > 0 THEN (ct.conversions * 100.0 / o.total_customers)
                        ELSE 0 
                    END) as conversion_rate
                   FROM conversion_trends ct
                   LEFT JOIN overview_kpis o ON DATE(ct.record_date) = DATE(o.record_date)
                   WHERE ct.record_date BETWEEN ? AND ?
                   GROUP BY date(ct.record_date, '-' || ((strftime('%w', ct.record_date) + 6) % 7) || ' days')
                   ORDER BY week_start ASC""",
                (start_date, end_date)
            )
        else:
            # For 7d/30d, show daily data
            cursor.execute(
                """SELECT 
                    ct.record_date,
                    SUM(ct.conversions) as conversions,
                    SUM(ct.ai_attributed_conversions) as ai_attributed_conversions,
                    AVG(CASE 
                        WHEN o.total_customers > 0 THEN (ct.conversions * 100.0 / o.total_customers)
                        ELSE 0 
                    END) as conversion_rate
                   FROM conversion_trends ct
                   LEFT JOIN overview_kpis o ON DATE(ct.record_date) = DATE(o.record_date)
                   WHERE ct.record_date BETWEEN ? AND ?
                   GROUP BY ct.record_date
                   ORDER BY ct.record_date ASC""",
                (start_date, end_date)
            )
        
        rows = cursor.fetchall()
        cursor.close()
        
        # Format results
        if rows:
            if period == '1y':
                data = [{
                    'record_date': row[0],
                    'conversions': int(row[1] or 0),
                    'ai_attributed_conversions': int(row[2] or 0),
                    'conversion_rate': float(row[3] or 0)
                } for row in rows]
            else:
                data = [{
                    'record_date': row[0],
                    'conversions': int(row[1] or 0),
                    'ai_attributed_conversions': int(row[2] or 0),
                    'conversion_rate': float(row[3] or 0)
                } for row in rows]
        else:
            # Fallback: get latest data
            cursor = conn.cursor()
            cursor.execute(
                """SELECT 
                    ct.record_date,
                    ct.conversions,
                    ct.ai_attributed_conversions,
                    CASE 
                        WHEN o.total_customers > 0 THEN (ct.conversions * 100.0 / o.total_customers)
                        ELSE 0 
                    END as conversion_rate
                   FROM conversion_trends ct
                   LEFT JOIN overview_kpis o ON DATE(ct.record_date) = DATE(o.record_date)
                   ORDER BY ct.record_date DESC
                   LIMIT 100"""
            )
            rows = cursor.fetchall()
            cursor.close()
            data = [{
                'record_date': row[0],
                'conversions': int(row[1] or 0),
                'ai_attributed_conversions': int(row[2] or 0),
                'conversion_rate': float(row[3] or 0)
            } for row in rows]
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/customers/segments')
def get_customer_segments():
    """Get customer segments with date range filtering - aggregate within period"""
    try:
        period = get_period_from_request()
        start_date, end_date = get_date_range(period)
        
        print(f"[API] /api/customers/segments called with period={period}, range={start_date} to {end_date}", flush=True)
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Aggregate segment data within the date range
        # Use latest record_date for each segment within the period
        cursor.execute(
            """SELECT 
                cs1.segment_name,
                cs1.segment_size,
                cs1.percentage,
                cs1.avg_lifetime_value,
                cs1.avg_order_value
            FROM customer_segments cs1
            INNER JOIN (
                SELECT segment_name, MAX(record_date) as max_date
                FROM customer_segments
                WHERE record_date BETWEEN ? AND ?
                GROUP BY segment_name
            ) cs2 ON cs1.segment_name = cs2.segment_name 
                  AND cs1.record_date = cs2.max_date
            ORDER BY cs1.segment_size DESC""",
            (start_date, end_date)
        )
        
        rows = cursor.fetchall()
        cursor.close()
        
        print(f"[DEBUG] Period {period}: Found {len(rows)} segments in range {start_date} to {end_date}", flush=True)
        
        # If no data found for the period, get latest available data
        if not rows:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """SELECT 
                    segment_name,
                    segment_size,
                    percentage,
                    avg_lifetime_value,
                    avg_order_value
                FROM customer_segments 
                WHERE record_date = (SELECT MAX(record_date) FROM customer_segments)
                ORDER BY segment_size DESC"""
            )
            rows = cursor.fetchall()
            cursor.close()
        
        # Convert rows to dict format and calculate percentage if missing
        result = []
        total = sum(row[1] or 0 for row in rows)
        
        for row in rows:
            size = int(row[1] or 0)
            pct = float(row[2] or 0)
            if not pct and total > 0:
                pct = (size / total) * 100
            result.append({
                'segment_name': row[0],
                'segment_size': size,
                'segment_percentage': round(pct, 1),
                'avg_lifetime_value': float(row[3] or 0),
                'avg_order_value': float(row[4] or 0)
            })
        
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/customers/behavioral-patterns')
def get_behavioral_patterns():
    """Get behavioral patterns with date range filtering"""
    try:
        period = get_period_from_request()
        start_date, end_date = get_date_range(period)
        
        print(f"[API] /api/customers/behavioral-patterns called with period={period}, range={start_date} to {end_date}", flush=True)
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get latest behavioral pattern data within the date range for each pattern type
        cursor.execute(
            """SELECT 
                bp1.pattern_type,
                bp1.pattern_name,
                bp1.value,
                bp1.metric_unit
            FROM behavioral_patterns bp1
            INNER JOIN (
                SELECT pattern_type, MAX(record_date) as max_date
                FROM behavioral_patterns
                WHERE record_date BETWEEN ? AND ?
                GROUP BY pattern_type
            ) bp2 ON bp1.pattern_type = bp2.pattern_type 
                  AND bp1.record_date = bp2.max_date
            ORDER BY bp1.pattern_type""",
            (start_date, end_date)
        )
        
        rows = cursor.fetchall()
        cursor.close()
        
        print(f"[DEBUG] Period {period}: Found {len(rows)} behavioral patterns in range {start_date} to {end_date}", flush=True)
        
        # If no data found for the period, get latest available data
        if not rows:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """SELECT 
                    pattern_type,
                    pattern_name,
                    value,
                    metric_unit
                FROM behavioral_patterns 
                WHERE record_date = (SELECT MAX(record_date) FROM behavioral_patterns)
                ORDER BY pattern_type"""
            )
            rows = cursor.fetchall()
            cursor.close()
        
        data = []
        for row in rows:
            data.append({
                'pattern_type': row[0],
                'pattern_name': row[1],
                'value': float(row[2] or 0),
                'metric_unit': row[3] or ''
            })
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/customers/concerns')
def get_customer_concerns():
    """Get customer concerns with date range filtering"""
    try:
        period = get_period_from_request()
        start_date, end_date = get_date_range(period)
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get concerns data for the date range, aggregate by concern_name
        cursor.execute(
            """SELECT 
                concern_name,
                concern_category,
                SUM(query_count) as query_count,
                AVG(ai_success_rate) as ai_success_rate
            FROM customer_concerns
            WHERE record_date BETWEEN ? AND ?
            GROUP BY concern_name, concern_category
            ORDER BY query_count DESC
            LIMIT 10""",
            (start_date, end_date)
        )
        
        rows = cursor.fetchall()
        cursor.close()
        
        if not rows:
            return jsonify({'success': True, 'data': []})
        
        data = []
        for row in rows:
            data.append({
                'concern_name': row[0],
                'concern_category': row[1],
                'query_count': int(row[2] or 0),
                'ai_success_rate': float(row[3] or 0)
            })
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/customers/lifetime-value')
def get_customer_lifetime_value():
    """Get customer lifetime value with date range filtering"""
    try:
        period = get_period_from_request()
        start_date, end_date = get_date_range(period)
        
        print(f"[API] /api/customers/lifetime-value called with period={period}, range={start_date} to {end_date}", flush=True)
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get CLV data - use the latest record_date for each segment within the period
        # This ensures each period shows its most recent snapshot of CLV
        cursor.execute(
            """SELECT 
                clv1.segment_name,
                clv1.current_clv,
                clv1.predicted_clv
            FROM customer_lifetime_value clv1
            INNER JOIN (
                SELECT segment_name, MAX(record_date) as max_date
                FROM customer_lifetime_value
                WHERE record_date BETWEEN ? AND ?
                GROUP BY segment_name
            ) clv2 ON clv1.segment_name = clv2.segment_name 
                  AND clv1.record_date = clv2.max_date
            ORDER BY 
                CASE clv1.segment_name
                    WHEN '0-30d' THEN 1
                    WHEN '31-60d' THEN 2
                    WHEN '61-90d' THEN 3
                    WHEN '91-180d' THEN 4
                    WHEN '181-365d' THEN 5
                    WHEN '1-2y' THEN 6
                    WHEN '2y+' THEN 7
                    ELSE 8
                END""",
            (start_date, end_date)
        )
        
        rows = cursor.fetchall()
        print(f"[DEBUG] Period {period}: Found {len(rows)} segments with data in range {start_date} to {end_date}", flush=True)
        
        # If no data found for the period, get the latest available data for each segment (before the period)
        if not rows:
            cursor.execute(
                """SELECT 
                    clv1.segment_name,
                    clv1.current_clv,
                    clv1.predicted_clv
                FROM customer_lifetime_value clv1
                INNER JOIN (
                    SELECT segment_name, MAX(record_date) as max_date
                    FROM customer_lifetime_value
                    GROUP BY segment_name
                ) clv2 ON clv1.segment_name = clv2.segment_name 
                      AND clv1.record_date = clv2.max_date
                ORDER BY 
                    CASE clv1.segment_name
                        WHEN '0-30d' THEN 1
                        WHEN '31-60d' THEN 2
                        WHEN '61-90d' THEN 3
                        WHEN '91-180d' THEN 4
                        WHEN '181-365d' THEN 5
                        WHEN '1-2y' THEN 6
                        WHEN '2y+' THEN 7
                        ELSE 8
                    END"""
            )
            rows = cursor.fetchall()
        
        cursor.close()
        
        if not rows:
            return jsonify({'success': True, 'data': []})
        
        data = []
        for row in rows:
            data.append({
                'segment_name': row[0],
                'current_clv': float(row[1] or 0),
                'predicted_clv': float(row[2] or 0)
            })
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/customers/product-gaps')
def get_product_gaps():
    """Get product gaps"""
    try:
        data = db.execute_query("SELECT * FROM product_gaps ORDER BY gap_rank LIMIT 10")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/customers/interactions')
def get_customer_interactions():
    """Get recent customer interactions with date range filtering"""
    try:
        limit = request.args.get('limit', 10, type=int)
        start_date, end_date = get_period_from_request()
        data = db.execute_query(
            """SELECT * FROM customer_interactions 
               WHERE interaction_date BETWEEN ? AND ?
               ORDER BY interaction_date DESC LIMIT ?""",
            (start_date, end_date, limit)
        )
        if not data:
            data = db.execute_query(
                "SELECT * FROM customer_interactions ORDER BY interaction_date DESC LIMIT ?",
                (limit,)
            )
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/products/analytics')
def get_product_analytics():
    """Get product analytics"""
    try:
        data = db.execute_query(
            "SELECT * FROM product_analytics ORDER BY revenue DESC LIMIT 20"
        )
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/products/category-performance')
def get_category_performance():
    """Get category performance"""
    try:
        data = db.execute_query("SELECT * FROM category_performance")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ai/model-performance')
def get_ai_model_performance():
    """Get AI model performance"""
    try:
        data = db.execute_query("SELECT * FROM ai_model_performance")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ai/feature-performance')
def get_ai_feature_performance():
    """Get AI feature performance"""
    try:
        data = db.execute_query("SELECT * FROM ai_feature_performance")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/interactions/summary')
def get_interaction_summary():
    """Get interaction summary with date range filtering - return both summary AND timeline data"""
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get aggregated summary
        cursor.execute(
            """SELECT 
                SUM(total_interactions) as total_interactions,
                SUM(chat_interactions) as chat_interactions,
                SUM(questionnaire_interactions) as questionnaire_interactions,
                SUM(image_analysis_interactions) as image_analysis_interactions,
                SUM(routine_planner_interactions) as routine_planner_interactions,
                AVG(avg_response_time) as avg_response_time
               FROM interaction_summary 
               WHERE record_date BETWEEN ? AND ?""",
            (start_date, end_date)
        )
        row = cursor.fetchone()
        
        # Get timeline data grouped by date
        if period in ['7d', '30d']:
            # Daily data
            cursor.execute(
                """SELECT 
                    record_date,
                    SUM(questionnaire_interactions) as questionnaire,
                    SUM(chat_interactions) as chat,
                    SUM(image_analysis_interactions) as image,
                    SUM(routine_planner_interactions) as routine
                   FROM interaction_summary 
                   WHERE record_date BETWEEN ? AND ?
                   GROUP BY record_date
                   ORDER BY record_date ASC""",
                (start_date, end_date)
            )
        elif period == '90d':
            # Weekly data
            cursor.execute(
                """SELECT 
                    date(record_date, '-' || ((strftime('%w', record_date) + 6) % 7) || ' days') as week_start,
                    SUM(questionnaire_interactions) as questionnaire,
                    SUM(chat_interactions) as chat,
                    SUM(image_analysis_interactions) as image,
                    SUM(routine_planner_interactions) as routine
                   FROM interaction_summary 
                   WHERE record_date BETWEEN ? AND ?
                   GROUP BY week_start
                   ORDER BY week_start ASC""",
                (start_date, end_date)
            )
        else:  # 1y
            # Monthly data
            cursor.execute(
                """SELECT 
                    date(record_date, 'start of month') as month_start,
                    SUM(questionnaire_interactions) as questionnaire,
                    SUM(chat_interactions) as chat,
                    SUM(image_analysis_interactions) as image,
                    SUM(routine_planner_interactions) as routine
                   FROM interaction_summary 
                   WHERE record_date BETWEEN ? AND ?
                   GROUP BY month_start
                   ORDER BY month_start ASC""",
                (start_date, end_date)
            )
        
        timeline_rows = cursor.fetchall()
        cursor.close()
        
        # Format timeline data
        timeline_data = []
        for t_row in timeline_rows:
            timeline_data.append({
                'date': t_row[0],
                'questionnaire_interactions': int(t_row[1] or 0),
                'chat_interactions': int(t_row[2] or 0),
                'image_analysis_interactions': int(t_row[3] or 0),
                'routine_planner_interactions': int(t_row[4] or 0)
            })
        
        if row and row[0] is not None:
            return jsonify({
                'success': True,
                'data': {
                    'total_interactions': int(row[0] or 0),
                    'chat_interactions': int(row[1] or 0),
                    'questionnaire_interactions': int(row[2] or 0),
                    'image_analysis_interactions': int(row[3] or 0),
                    'routine_planner_interactions': int(row[4] or 0),
                    'avg_response_time': float(row[5] or 0)
                },
                'timeline': timeline_data
            })
        
        # Fallback: get latest data
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM interaction_summary ORDER BY record_date DESC LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        
        if row:
            return jsonify({
                'success': True,
                'data': {
                    'total_interactions': int(row[2] or 0),
                    'chat_interactions': int(row[3] or 0),
                    'questionnaire_interactions': int(row[4] or 0),
                    'image_analysis_interactions': int(row[5] or 0),
                    'routine_planner_interactions': int(row[6] or 0),
                    'avg_response_time': float(row[7] or 0)
                },
                'timeline': []  # Empty timeline for fallback
            })
        
        return jsonify({'success': True, 'data': None})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/revenue/summary')
def get_revenue_summary():
    """Get revenue summary with date range filtering - aggregate if multiple records"""
    try:
        start_date, end_date = get_period_from_request()
        # Aggregate revenue data within the date range
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT 
                AVG(total_revenue_impact) as total_revenue_impact,
                AVG(avg_order_value) as avg_order_value,
                AVG(avg_order_value_with_ai) as avg_order_value_with_ai,
                AVG(avg_order_value_improvement) as avg_order_value_improvement,
                AVG(monthly_investment) as monthly_investment,
                AVG(monthly_return) as monthly_return,
                AVG(roi_percentage) as roi_percentage
               FROM revenue_summary 
               WHERE record_date BETWEEN ? AND ?""",
            (start_date, end_date)
        )
        row = cursor.fetchone()
        cursor.close()
        
        if row and row[0] is not None:
            return jsonify({
                'success': True,
                'data': {
                    'total_revenue_impact': float(row[0] or 0),
                    'avg_order_value': float(row[1] or 0),
                    'avg_order_value_with_ai': float(row[2] or 0),
                    'avg_order_value_improvement': float(row[3] or 0),
                    'monthly_investment': float(row[4] or 0),
                    'monthly_return': float(row[5] or 0),
                    'roi_percentage': float(row[6] or 0),
                    'roi': float(row[6] or 0) / 100.0 if row[6] else 0.0  # Convert percentage to decimal
                }
            })
        
        # Fallback: get latest data
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                total_revenue_impact,
                avg_order_value,
                avg_order_value_with_ai,
                avg_order_value_improvement,
                monthly_investment,
                monthly_return,
                roi_percentage
            FROM revenue_summary 
            ORDER BY record_date DESC 
            LIMIT 1
        """)
        row = cursor.fetchone()
        cursor.close()
        
        if row:
            return jsonify({
                'success': True,
                'data': {
                    'total_revenue_impact': float(row[0] or 0),
                    'avg_order_value': float(row[1] or 0),
                    'avg_order_value_with_ai': float(row[2] or 0),
                    'avg_order_value_improvement': float(row[3] or 0),
                    'monthly_investment': float(row[4] or 0),
                    'monthly_return': float(row[5] or 0),
                    'roi_percentage': float(row[6] or 0),
                    'roi': float(row[6] or 0) / 100.0 if row[6] else 0.0
                }
            })
        
        return jsonify({'success': True, 'data': None})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/customer/satisfaction')
def get_customer_satisfaction():
    """Get customer satisfaction trends with date range filtering"""
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Get satisfaction data for the date range
        cursor.execute(
            """SELECT 
                record_date,
                overall_satisfaction,
                product_match_quality,
                ai_helpfulness
               FROM customer_satisfaction 
               WHERE record_date BETWEEN ? AND ?
               ORDER BY record_date ASC""",
            (start_date, end_date)
        )
        rows = cursor.fetchall()
        cursor.close()
        
        if rows:
            data = [{
                'record_date': row[0],
                'overall_satisfaction': float(row[1] or 0),
                'product_match_quality': float(row[2] or 0),
                'ai_helpfulness': float(row[3] or 0)
            } for row in rows]
            return jsonify({'success': True, 'data': data})
        
        return jsonify({'success': True, 'data': []})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/revenue/attribution')
def get_revenue_attribution():
    """Get revenue attribution with date range filtering - aggregate by date AND feature for chart timeline"""
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        # Determine aggregation level based on period
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # For short periods (7d, 30d), group by day; for longer periods, group by week or month
        if period == '7d':
            # Daily aggregation
            cursor.execute(
                """SELECT 
                    record_date,
                    ai_feature,
                    SUM(revenue_amount) as revenue_amount,
                    AVG(percentage) as percentage
                   FROM revenue_attribution 
                   WHERE record_date BETWEEN ? AND ?
                   GROUP BY record_date, ai_feature
                   ORDER BY record_date ASC, revenue_amount DESC""",
                (start_date, end_date)
            )
        elif period == '30d':
            # Daily aggregation for 30 days
            cursor.execute(
                """SELECT 
                    record_date,
                    ai_feature,
                    SUM(revenue_amount) as revenue_amount,
                    AVG(percentage) as percentage
                   FROM revenue_attribution 
                   WHERE record_date BETWEEN ? AND ?
                   GROUP BY record_date, ai_feature
                   ORDER BY record_date ASC, revenue_amount DESC""",
                (start_date, end_date)
            )
        elif period == '90d':
            # Weekly aggregation (group by week)
            cursor.execute(
                """SELECT 
                    date(record_date, '-' || ((strftime('%w', record_date) + 6) % 7) || ' days') as week_start,
                    ai_feature,
                    SUM(revenue_amount) as revenue_amount,
                    AVG(percentage) as percentage
                   FROM revenue_attribution 
                   WHERE record_date BETWEEN ? AND ?
                   GROUP BY week_start, ai_feature
                   ORDER BY week_start ASC, revenue_amount DESC""",
                (start_date, end_date)
            )
        else:  # 1y
            # Monthly aggregation
            cursor.execute(
                """SELECT 
                    date(record_date, 'start of month') as month_start,
                    ai_feature,
                    SUM(revenue_amount) as revenue_amount,
                    AVG(percentage) as percentage
                   FROM revenue_attribution 
                   WHERE record_date BETWEEN ? AND ?
                   GROUP BY month_start, ai_feature
                   ORDER BY month_start ASC, revenue_amount DESC""",
                (start_date, end_date)
            )
        
        rows = cursor.fetchall()
        cursor.close()
        
        if not rows:
            # Fallback: build a recent window based on the selected period
            cursor = conn.cursor()
            if period == '7d':
                # Last 7 days from latest available date
                cursor.execute(
                    """SELECT 
                        record_date,
                        ai_feature,
                        SUM(revenue_amount) as revenue_amount,
                        AVG(percentage) as percentage
                       FROM revenue_attribution 
                       WHERE record_date >= date((SELECT MAX(record_date) FROM revenue_attribution), '-7 days')
                       GROUP BY record_date, ai_feature
                       ORDER BY record_date ASC, revenue_amount DESC"""
                )
            elif period == '30d':
                cursor.execute(
                    """SELECT 
                        record_date,
                        ai_feature,
                        SUM(revenue_amount) as revenue_amount,
                        AVG(percentage) as percentage
                       FROM revenue_attribution 
                       WHERE record_date >= date((SELECT MAX(record_date) FROM revenue_attribution), '-30 days')
                       GROUP BY record_date, ai_feature
                       ORDER BY record_date ASC, revenue_amount DESC"""
                )
            elif period == '90d':
                cursor.execute(
                    """SELECT 
                        date(record_date, '-' || ((strftime('%w', record_date) + 6) % 7) || ' days') as week_start,
                        ai_feature,
                        SUM(revenue_amount) as revenue_amount,
                        AVG(percentage) as percentage
                       FROM revenue_attribution 
                       WHERE record_date >= date((SELECT MAX(record_date) FROM revenue_attribution), '-90 days')
                       GROUP BY week_start, ai_feature
                       ORDER BY week_start ASC, revenue_amount DESC"""
                )
            else:  # 1y
                cursor.execute(
                    """SELECT 
                        date(record_date, 'start of month') as month_start,
                        ai_feature,
                        SUM(revenue_amount) as revenue_amount,
                        AVG(percentage) as percentage
                       FROM revenue_attribution 
                       WHERE record_date >= date((SELECT MAX(record_date) FROM revenue_attribution), '-365 days')
                       GROUP BY month_start, ai_feature
                       ORDER BY month_start ASC, revenue_amount DESC"""
                )
            rows = cursor.fetchall()
            cursor.close()
        
        # Convert to proper format - preserve date information for timeline charts
        result = []
        seen_combinations = set()
        for row in rows:
            date_key = row[0]  # record_date, week_start, or month_start
            feature = row[1]
            revenue = row[2]
            percentage = row[3]
            
            # Use combination of date and feature as unique key
            combo_key = f"{date_key}_{feature}"
            if combo_key not in seen_combinations:
                seen_combinations.add(combo_key)
                result.append({
                    'record_date': date_key,
                    'ai_feature': feature,
                    'revenue_source': feature,  # For compatibility
                    'revenue_amount': revenue,
                    'percentage': percentage
                })
        
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/revenue/category')
def get_category_revenue():
    """Get category revenue"""
    try:
        data = db.execute_query("SELECT * FROM category_revenue ORDER BY revenue_amount DESC")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/revenue/customer-value')
def get_customer_value_analysis():
    """Get customer value analysis"""
    try:
        data = db.execute_query("SELECT * FROM customer_value_analysis")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/revenue/forecasting')
def get_revenue_forecasting():
    """Get revenue forecasting"""
    try:
        data = db.execute_query("SELECT * FROM revenue_forecasting ORDER BY forecast_date ASC")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/realtime/system-health')
def get_system_health():
    """Get system health"""
    try:
        data = db.execute_query("SELECT * FROM system_health ORDER BY record_date DESC LIMIT 10")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/realtime/api-endpoints')
def get_api_endpoints():
    """Get API endpoints"""
    try:
        data = db.execute_query("SELECT * FROM api_endpoints")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/billing/summary')
def get_billing_summary():
    """Get billing summary"""
    try:
        data = db.execute_query(
            "SELECT * FROM billing_summary ORDER BY billing_period_start DESC LIMIT 1"
        )
        return jsonify({'success': True, 'data': data[0] if data else None})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/billing/usage-breakdown')
def get_usage_breakdown():
    """Get usage breakdown"""
    try:
        data = db.execute_query("SELECT * FROM usage_breakdown ORDER BY record_date DESC LIMIT 30")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_api_configurations():
    """Get API configurations"""
    try:
        data = db.execute_query("SELECT * FROM api_configurations")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    print("Starting SmartShopie Dashboard Backend...")
    print("Server running at: http://localhost:5000")
    app.run(host="0.0.0.0", port=5001, debug=True, use_reloader=False)


