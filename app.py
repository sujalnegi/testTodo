import os
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, session, render_template

app = Flask(__name__)
app.secret_key = "super_secret_key_for_demo_app"

DATA_DIR = "data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")
NOTES_FILE = os.path.join(DATA_DIR, "notes.json")

def read_json(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, 'r') as f:
        return json.load(f)

def write_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def init_data():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(USERS_FILE):
        write_json(USERS_FILE, {"users": []})
    if not os.path.exists(NOTES_FILE):
        write_json(NOTES_FILE, {"notes": []})

# Run init on startup
init_data()

# Routes for Pages
@app.route('/')
@app.route('/index.html')
def index():
    return render_template('index.html')

@app.route('/app.html')
def app_page():
    return render_template('app.html')

# API Endpoints
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
        
    db = read_json(USERS_FILE)
    if any(u['username'] == username for u in db['users']):
        return jsonify({"error": "Username already taken"}), 400
        
    db['users'].append({"username": username, "password": password})
    write_json(USERS_FILE, db)
    return jsonify({"success": True}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    db = read_json(USERS_FILE)
    for u in db['users']:
        if u['username'] == username and u['password'] == password:
            session['username'] = username
            return jsonify({"success": True, "username": username}), 200
            
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({"success": True}), 200

@app.route('/api/session', methods=['GET'])
def get_session():
    username = session.get('username')
    if username:
        return jsonify({"username": username}), 200
    return jsonify({"error": "Not logged in"}), 401

@app.route('/api/notes', methods=['GET'])
def get_notes():
    username = session.get('username')
    if not username:
        return jsonify({"error": "Not logged in"}), 401
        
    db = read_json(NOTES_FILE)
    user_notes = [n for n in db['notes'] if n['username'] == username]
    user_notes.sort(key=lambda x: x['updated_at'], reverse=True)
    
    return jsonify({"notes": user_notes}), 200

@app.route('/api/notes', methods=['POST'])
def create_note():
    username = session.get('username')
    if not username:
        return jsonify({"error": "Not logged in"}), 401
        
    data = request.json
    now = datetime.utcnow().isoformat()
    new_note = {
        "id": str(uuid.uuid4()),
        "username": username,
        "title": data.get('title', ''),
        "body": data.get('body', ''),
        "created_at": now,
        "updated_at": now
    }
    
    db = read_json(NOTES_FILE)
    db['notes'].append(new_note)
    write_json(NOTES_FILE, db)
    
    return jsonify({"note": new_note}), 201

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    username = session.get('username')
    if not username:
        return jsonify({"error": "Not logged in"}), 401
        
    data = request.json
    db = read_json(NOTES_FILE)
    
    for note in db['notes']:
        if note['id'] == note_id and note['username'] == username:
            note['title'] = data.get('title', note['title'])
            note['body'] = data.get('body', note['body'])
            note['updated_at'] = datetime.utcnow().isoformat()
            write_json(NOTES_FILE, db)
            return jsonify({"note": note}), 200
            
    return jsonify({"error": "Note not found or unauthorized"}), 404

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    username = session.get('username')
    if not username:
        return jsonify({"error": "Not logged in"}), 401
        
    db = read_json(NOTES_FILE)
    original_len = len(db['notes'])
    db['notes'] = [n for n in db['notes'] if not (n['id'] == note_id and n['username'] == username)]
    
    if len(db['notes']) < original_len:
        write_json(NOTES_FILE, db)
        return jsonify({"success": True}), 200
        
    return jsonify({"error": "Note not found or unauthorized"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
