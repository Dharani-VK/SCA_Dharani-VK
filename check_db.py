import sqlite3
import os

db_path = "backend/analytics.db"
if not os.path.exists(db_path):
    print("DB NOT FOUND")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT roll_no, full_name, is_admin FROM students ORDER BY id DESC LIMIT 5")
rows = cursor.fetchall()
print("\n--- RECENT USERS ---")
for row in rows:
    print(row)
print("--------------------")
conn.close()
