import sqlite3

conn = sqlite3.connect('backend/kisanlink.db')
c = conn.cursor()

paddy = c.execute("SELECT id, crop_name, images, status, lot_code FROM produce WHERE lot_code = 'LOT-93539'").fetchone()
if paddy:
    img = paddy[2]
    print(f"LOT-93539 Paddy Image: Length={len(img)}, StartsWith={img[:60]}")

conn.close()
