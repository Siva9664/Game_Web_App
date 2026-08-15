import os
import sqlite3
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'leaderboard.db')


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            score INTEGER NOT NULL,
            coins INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('SELECT COUNT(*) FROM scores')

    if cursor.fetchone()[0] == 0:
        default_scores = [
            ('Jake', 15420, 142),
            ('Tricky', 12850, 98),
            ('Fresh', 9600, 75),
            ('Yutani', 7400, 50),
            ('Lucy', 5200, 35)
        ]

        cursor.executemany(
            'INSERT INTO scores (username, score, coins) VALUES (?, ?, ?)',
            default_scores
        )

    conn.commit()
    conn.close()


init_db()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/scores', methods=['GET'])
def get_scores():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT username, score, coins,
                   strftime('%Y-%m-%d %H:%M', created_at)
            FROM scores
            ORDER BY score DESC
            LIMIT 10
        ''')

        rows = cursor.fetchall()
        conn.close()

        scores = [
            {
                'username': row[0],
                'score': row[1],
                'coins': row[2],
                'date': row[3]
            }
            for row in rows
        ]

        return jsonify({
            'status': 'success',
            'scores': scores
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/scores', methods=['POST'])
def add_score():
    try:
        data = request.get_json()

        username = data.get('username', 'Anonymous').strip() or 'Anonymous'
        score = int(data.get('score', 0))
        coins = int(data.get('coins', 0))

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            'INSERT INTO scores (username, score, coins) VALUES (?, ?, ?)',
            (username, score, coins)
        )

        conn.commit()

        cursor.execute(
            'SELECT COUNT(*) FROM scores WHERE score > ?',
            (score,)
        )

        rank = cursor.fetchone()[0] + 1

        conn.close()

        return jsonify({
            'status': 'success',
            'message': 'Score saved successfully!',
            'rank': rank
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'game': 'Subway Surfers 3D Endless Runner'
    })


if __name__ == '__main__':
    print("Starting Subway Surfers Web Server on http://127.0.0.1:5000 ...")
    app.run(host='0.0.0.0', port=5000, debug=True)