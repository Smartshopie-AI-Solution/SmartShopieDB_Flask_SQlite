import sqlite3

# Path to your SQL schema file
SQL_FILE = "database_schema.sql"
# Name of the SQLite database to create
DB_NAME = "smartshopie_dashboard.db"

def create_database(db_name, sql_file):
    """Creates an SQLite database using the provided SQL schema."""
    try:
        # Read the entire SQL schema file
        with open(sql_file, 'r', encoding='utf-8') as f:
            schema_sql = f.read()

        # Connect to (or create) the database
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()

        # Execute the schema SQL
        cursor.executescript(schema_sql)

        # Commit and close connection
        conn.commit()
        conn.close()

        print(f"✅ Database '{db_name}' created successfully using schema '{sql_file}'.")

    except Exception as e:
        print(f"❌ Error while creating database: {e}")

if __name__ == "__main__":
    create_database(DB_NAME, SQL_FILE)
