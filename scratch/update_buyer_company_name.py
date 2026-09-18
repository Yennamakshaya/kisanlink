import sqlite3

conn = sqlite3.connect('backend/kisanlink.db')
c = conn.cursor()

tables = [t[0] for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

updated_counts = {}
for t in tables:
    cols = [info[1] for info in c.execute(f"PRAGMA table_info({t})").fetchall()]
    for col in cols:
        try:
            cnt = c.execute(f"SELECT COUNT(*) FROM {t} WHERE {col} LIKE '%Shree Foods%'").fetchone()[0]
            if cnt > 0:
                print(f"Table '{t}', column '{col}' has {cnt} rows matching 'Shree Foods'")
                c.execute(f"UPDATE {t} SET {col} = REPLACE({col}, 'Shree Foods Pvt Ltd', 'Balaji Trades') WHERE {col} LIKE '%Shree Foods%'")
                c.execute(f"UPDATE {t} SET {col} = REPLACE({col}, 'Shree Foods', 'Balaji Trades') WHERE {col} LIKE '%Shree Foods%'")
                updated_counts[f"{t}.{col}"] = cnt
        except Exception as e:
            print(f"Error on {t}.{col}: {e}")

conn.commit()
print("Database update complete! Updated columns:", updated_counts)

# Print buyer profiles table to verify
profiles = c.execute("SELECT id, company_name FROM buyer_profiles LIMIT 3").fetchall()
print("First 3 buyer profiles:", profiles)

conn.close()
