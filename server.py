import json
import sqlite3
import urllib.parse
from http.server import SimpleHTTPRequestHandler, HTTPServer
from datetime import datetime
import uuid
import os

DB_FILE = 'database.sqlite'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT,
            status TEXT,
            emailVerified BOOLEAN,
            verificationToken TEXT,
            phone TEXT,
            avatar TEXT,
            specialization TEXT,
            licenseNumber TEXT,
            experience INTEGER,
            bio TEXT,
            createdAt TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            patientId TEXT,
            doctorId TEXT,
            date TEXT,
            time TEXT,
            status TEXT,
            reason TEXT,
            symptoms TEXT,
            notes TEXT,
            createdAt TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            userId TEXT,
            title TEXT,
            message TEXT,
            type TEXT,
            read BOOLEAN,
            createdAt TEXT
        )
    ''')
    # Create default admin if not exists
    c.execute("SELECT * FROM users WHERE role='admin'")
    if not c.fetchone():
        c.execute("""
            INSERT INTO users (id, name, email, password, role, status, emailVerified, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), 'Super Admin', 'admin@hospital.com', 'Admin@123', 'admin', 'active', True, datetime.now().isoformat()))
    conn.commit()
    conn.close()

class APIServer(SimpleHTTPRequestHandler):
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def get_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode('utf-8'))

    def do_GET(self):
        if self.path.startswith('/api/'):
            parsed_path = urllib.parse.urlparse(self.path)
            path = parsed_path.path
            query = dict(urllib.parse.parse_qsl(parsed_path.query))
            
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            try:
                if path == '/api/users':
                    query_str = "SELECT * FROM users WHERE 1=1"
                    params = []
                    for key in ['role', 'status', 'email', 'id']:
                        if key in query:
                            query_str += f" AND {key}=?"
                            params.append(query[key])
                    c.execute(query_str, params)
                    users = [dict(row) for row in c.fetchall()]
                    # Fix boolean handling
                    for u in users:
                        u['emailVerified'] = bool(u['emailVerified'])
                    self.send_json(users)
                
                elif path == '/api/appointments':
                    query_str = "SELECT * FROM appointments WHERE 1=1"
                    params = []
                    for key in ['patientId', 'doctorId']:
                        if key in query:
                            query_str += f" AND {key}=?"
                            params.append(query[key])
                    c.execute(query_str, params)
                    apts = [dict(row) for row in c.fetchall()]
                    self.send_json(apts)

                elif path == '/api/notifications':
                    query_str = "SELECT * FROM notifications WHERE 1=1"
                    params = []
                    if 'userId' in query:
                        query_str += " AND userId=?"
                        params.append(query['userId'])
                    query_str += " ORDER BY createdAt DESC"
                    c.execute(query_str, params)
                    notes = [dict(row) for row in c.fetchall()]
                    for n in notes:
                        n['read'] = bool(n['read'])
                    self.send_json(notes)
                    
                elif path == '/api/stats':
                    stats = {}
                    c.execute("SELECT COUNT(*) FROM users WHERE role='patient'")
                    stats['totalPatients'] = c.fetchone()[0]
                    c.execute("SELECT COUNT(*) FROM users WHERE role='doctor' AND status='active'")
                    stats['totalDoctors'] = c.fetchone()[0]
                    c.execute("SELECT COUNT(*) FROM users WHERE role='doctor' AND status='pending_approval'")
                    stats['pendingDoctors'] = c.fetchone()[0]
                    c.execute("SELECT COUNT(*) FROM appointments")
                    stats['totalAppointments'] = c.fetchone()[0]
                    today = datetime.now().strftime('%Y-%m-%d')
                    c.execute("SELECT COUNT(*) FROM appointments WHERE date=?", (today,))
                    stats['todayAppointments'] = c.fetchone()[0]
                    c.execute("SELECT COUNT(*) FROM appointments WHERE status='pending'")
                    stats['pendingAppointments'] = c.fetchone()[0]
                    self.send_json(stats)
                    
                else:
                    self.send_json({"error": "Not found"}, 404)
            finally:
                conn.close()
        else:
            return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            path = urllib.parse.urlparse(self.path).path
            body = self.get_body()
            
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            try:
                if path == '/api/users':
                    user_id = str(uuid.uuid4())
                    now = datetime.now().isoformat()
                    c.execute("""
                        INSERT INTO users (id, name, email, password, role, status, emailVerified, verificationToken, phone, avatar, specialization, licenseNumber, experience, bio, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        user_id, body.get('name'), body.get('email'), body.get('password'), body.get('role'),
                        body.get('status'), body.get('emailVerified', False), body.get('verificationToken'),
                        body.get('phone'), body.get('avatar'), body.get('specialization'), body.get('licenseNumber'),
                        body.get('experience'), body.get('bio'), now
                    ))
                    conn.commit()
                    c.execute("SELECT * FROM users WHERE id=?", (user_id,))
                    user = dict(c.fetchone())
                    user['emailVerified'] = bool(user['emailVerified'])
                    self.send_json(user)
                    
                elif path == '/api/appointments':
                    apt_id = str(uuid.uuid4())
                    now = datetime.now().isoformat()
                    c.execute("""
                        INSERT INTO appointments (id, patientId, doctorId, date, time, status, reason, symptoms, notes, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        apt_id, body.get('patientId'), body.get('doctorId'), body.get('date'), body.get('time'),
                        body.get('status', 'pending'), body.get('reason'), body.get('symptoms'), body.get('notes'), now
                    ))
                    conn.commit()
                    c.execute("SELECT * FROM appointments WHERE id=?", (apt_id,))
                    self.send_json(dict(c.fetchone()))
                    
                elif path == '/api/notifications':
                    notif_id = str(uuid.uuid4())
                    now = datetime.now().isoformat()
                    c.execute("""
                        INSERT INTO notifications (id, userId, title, message, type, read, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        notif_id, body.get('userId'), body.get('title'), body.get('message'),
                        body.get('type', 'info'), False, now
                    ))
                    conn.commit()
                    c.execute("SELECT * FROM notifications WHERE id=?", (notif_id,))
                    notif = dict(c.fetchone())
                    notif['read'] = bool(notif['read'])
                    self.send_json(notif)

                else:
                    self.send_json({"error": "Not found"}, 404)
            except sqlite3.IntegrityError:
                self.send_json({"error": "Integrity error (e.g. duplicate email)"}, 400)
            finally:
                conn.close()
        else:
            self.send_error(405)

    def do_PUT(self):
        if self.path.startswith('/api/'):
            path = urllib.parse.urlparse(self.path).path
            body = self.get_body()
            
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            try:
                if path.startswith('/api/users/'):
                    user_id = path.split('/')[-1]
                    update_fields = []
                    params = []
                    for k, v in body.items():
                        if k != 'id':
                            update_fields.append(f"{k}=?")
                            params.append(v)
                    params.append(user_id)
                    c.execute(f"UPDATE users SET {', '.join(update_fields)} WHERE id=?", params)
                    conn.commit()
                    c.execute("SELECT * FROM users WHERE id=?", (user_id,))
                    user = dict(c.fetchone())
                    user['emailVerified'] = bool(user['emailVerified'])
                    self.send_json(user)
                    
                elif path.startswith('/api/appointments/'):
                    apt_id = path.split('/')[-1]
                    update_fields = []
                    params = []
                    for k, v in body.items():
                        if k != 'id':
                            update_fields.append(f"{k}=?")
                            params.append(v)
                    params.append(apt_id)
                    c.execute(f"UPDATE appointments SET {', '.join(update_fields)} WHERE id=?", params)
                    conn.commit()
                    c.execute("SELECT * FROM appointments WHERE id=?", (apt_id,))
                    self.send_json(dict(c.fetchone()))

                elif path == '/api/notifications/read':
                    user_id = body.get('userId')
                    c.execute("UPDATE notifications SET read=1 WHERE userId=?", (user_id,))
                    conn.commit()
                    self.send_json({"ok": True})
                else:
                    self.send_json({"error": "Not found"}, 404)
            finally:
                conn.close()
        else:
            self.send_error(405)
            
    def do_DELETE(self):
        if self.path.startswith('/api/'):
            path = urllib.parse.urlparse(self.path).path
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            try:
                if path.startswith('/api/users/'):
                    user_id = path.split('/')[-1]
                    c.execute("DELETE FROM users WHERE id=?", (user_id,))
                    conn.commit()
                    self.send_json({"ok": True})
                elif path.startswith('/api/appointments/'):
                    apt_id = path.split('/')[-1]
                    c.execute("DELETE FROM appointments WHERE id=?", (apt_id,))
                    conn.commit()
                    self.send_json({"ok": True})
                else:
                    self.send_json({"error": "Not found"}, 404)
            finally:
                conn.close()
        else:
            self.send_error(405)

if __name__ == '__main__':
    init_db()
    # Ensure current working directory is served correctly
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(('127.0.0.1', 8000), APIServer)
    print("Server starting on http://127.0.0.1:8000")
    server.serve_forever()
