import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import psycopg2
import bcrypt

# Load variables from .env
load_dotenv()

# Create Flask application
app = Flask(__name__)
CORS(app)


# --------------------------------------------------
# Database connection
# --------------------------------------------------

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise Exception("DATABASE_URL is missing from .env")

    return psycopg2.connect(database_url)


# --------------------------------------------------
# Create users table
# --------------------------------------------------

def create_users_table():
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(150) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)

    connection.commit()

    cursor.close()
    connection.close()


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.route("/")
def home():
    return jsonify({
        "message": "MinuteX backend is running!"
    })


# --------------------------------------------------
# Database test
# --------------------------------------------------

@app.route("/db-test")
def db_test():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT NOW();")
        current_time = cursor.fetchone()[0]

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "MinuteX is connected to Neon!",
            "database_time": str(current_time)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Database connection failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# Signup
# --------------------------------------------------

@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data received."
            }), 400

        full_name = data.get("fullName", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        # Validate required fields
        if not full_name or not email or not password:
            return jsonify({
                "success": False,
                "message": "Full name, email, and password are required."
            }), 400

        # Password validation
        if len(password) < 8:
            return jsonify({
                "success": False,
                "message": "Password must contain at least 8 characters."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check whether email already exists
        cursor.execute(
            "SELECT id FROM users WHERE email = %s;",
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            cursor.close()
            connection.close()

            return jsonify({
                "success": False,
                "message": "An account with this email already exists."
            }), 409

        # Hash password
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        # Save user
        cursor.execute(
            """
            INSERT INTO users (full_name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id, full_name, email;
            """,
            (full_name, email, password_hash)
        )

        user = cursor.fetchone()

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "Account created successfully!",
            "user": {
                "id": user[0],
                "fullName": user[1],
                "email": user[2]
            }
        }), 201

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Unable to create account.",
            "error": str(e)
        }), 500


# --------------------------------------------------
# Login
# --------------------------------------------------

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data received."
            }), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, full_name, email, password_hash
            FROM users
            WHERE email = %s;
            """,
            (email,)
        )

        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        user_id, full_name, user_email, password_hash = user

        # Compare entered password with stored hash
        password_is_correct = bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )

        if not password_is_correct:
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": {
                "id": user_id,
                "fullName": full_name,
                "email": user_email
            }
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Unable to log in.",
            "error": str(e)
        }), 500


# --------------------------------------------------
# Start Flask
# --------------------------------------------------

if __name__ == "__main__":
    create_users_table()
    app.run(debug=True, port=5000)