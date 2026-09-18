import sqlite3

conn = sqlite3.connect('backend/kisanlink.db')
c = conn.cursor()

# 1. Verify LOT-42055 Onion listing is completely gone
onion_count = c.execute("SELECT COUNT(*) FROM produce WHERE lot_code = 'LOT-42055'").fetchone()[0]
print(f"LOT-42055 count in database: {onion_count}")

# 2. Check Paddy listing (LOT-93539) image data
paddy_row = c.execute("SELECT id, crop_name, images, status, lot_code FROM produce WHERE crop_name LIKE '%Paddy%'").fetchone()
if paddy_row:
    img = paddy_row[2]
    is_valid_b64 = img.startswith("data:image/") if img else False
    print(f"Paddy Lot ({paddy_row[4]}): Status = {paddy_row[3]}, Has Base64 Image = {is_valid_b64}, Image Length = {len(img) if img else 0}")
else:
    print("No Paddy listing found.")

# 3. List all produce items and their statuses
all_rows = c.execute("SELECT id, crop_name, status, lot_code FROM produce").fetchall()
print(f"\nTotal produce listings: {len(all_rows)}")
for r in all_rows:
    print(f" - Lot {r[3]}: Crop = {r[1]}, Status = {r[2]}")

conn.close()
