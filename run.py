"""
Startup script for SmartShopie Dashboard Backend
"""
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

if __name__ == '__main__':
    print("=" * 60)
    print("SmartShopie AI - Client Analytics Dashboard")
    print("=" * 60)
    print("\nStarting Flask server...")
    print("=" * 60)
    print("IMPORTANT: Access the dashboard at:")
    print("  http://localhost:5001")
    print("=" * 60)
    print("DO NOT open the HTML file directly!")
    print("=" * 60)
    print("API health: http://localhost:5001/api/health")
    print("\nPress CTRL+C to stop the server\n")
    print("=" * 60)
    
    # Import and run the Flask app
    from app import app
    
    # Enable unbuffered output (Python 3.7+)
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(line_buffering=True)
        except:
            pass
    
    print("[SERVER] Flask server starting on port 5001...", flush=True)
    print("[SERVER] Waiting for requests...\n", flush=True)
    app.run(host="0.0.0.0", port=5001, debug=True, use_reloader=False)


