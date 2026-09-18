import sqlite3

conn = sqlite3.connect('backend/kisanlink.db')
c = conn.cursor()
c.execute("DELETE FROM produce WHERE lot_code = 'LOT-42055'")
conn.commit()

count = c.execute("SELECT COUNT(*) FROM produce WHERE lot_code = 'LOT-42055'").fetchone()[0]
print(f"LOT-42055 count remaining: {count}")
conn.close()
