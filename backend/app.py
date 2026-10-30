import os
import logging

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import psycopg2
import bcrypt


# --------------------------------------------------
# Configuration
# --------------------------------------------------

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "https://minute-x.vercel.app",
                "http://localhost:5173",
                "http://localhost:5174"
            ]
        }
    }
)


# --------------------------------------------------
# Database connection
# --------------------------------------------------

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise Exception("DATABASE_URL environment variable is missing.")

    database_url = database_url.strip()

    # Handle accidentally copied environment variable syntax
    if database_url.startswith("DATABASE_URL="):
        database_url = database_url.split("=", 1)[1].strip()

    # Remove accidental surrounding quotes
    if (
        len(database_url) >= 2
        and database_url[0] in ("'", '"')
        and database_url[-1] == database_url[0]
    ):
        database_url = database_url[1:-1]

    if not database_url.startswith(
        ("postgresql://", "postgres://")
    ):
        raise Exception(
            "Invalid DATABASE_URL format. "
            "Expected a PostgreSQL connection string."
        )

    return psycopg2.connect(
        database_url,
        connect_timeout=15
    )


# --------------------------------------------------
# Create users table
# --------------------------------------------------

def create_users_table():
    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    full_name VARCHAR(150) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE
                    DEFAULT CURRENT_TIMESTAMP
                );
            """)

        connection.commit()
        logger.info("Users table is ready.")

    except Exception:
        if connection:
            connection.rollback()

        logger.exception("Failed to initialize users table.")
        raise

    finally:
        if connection:
            connection.close()


# --------------------------------------------------
# Initialize database for Render / Gunicorn
# --------------------------------------------------

try:
    create_users_table()
except Exception:
    logger.exception(
        "Database initialization failed during application startup."
    )


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.route("/")
def home():
    return jsonify({
        "success": True,
        "message": "MinuteX backend is running!"
    })


# --------------------------------------------------
# Database test
# --------------------------------------------------

@app.route("/db-test")
def db_test():
    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute("SELECT NOW();")
            current_time = cursor.fetchone()[0]

        return jsonify({
            "success": True,
            "message": "MinuteX is connected to Neon!",
            "database_time": str(current_time)
        })

    except Exception:
        logger.exception("Database test failed.")

        return jsonify({
            "success": False,
            "message": "Database connection failed. Check server logs."
        }), 500

    finally:
        if connection:
            connection.close()


# --------------------------------------------------
# Signup
# --------------------------------------------------

@app.route("/signup", methods=["POST"])
def signup():
    connection = None

    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No valid data received."
            }), 400

        full_name = data.get("fullName", "")
        email = data.get("email", "")
        password = data.get("password", "")

        if not all(isinstance(value, str) for value in
                   [full_name, email, password]):
            return jsonify({
                "success": False,
                "message": "Invalid input format."
            }), 400

        full_name = full_name.strip()
        email = email.strip().lower()

        if not full_name or not email or not password:
            return jsonify({
                "success": False,
                "message": "Full name, email, and password are required."
            }), 400

        if len(password) < 8:
            return jsonify({
                "success": False,
                "message": "Password must contain at least 8 characters."
            }), 400

        # bcrypt has a 72-byte password limit
        if len(password.encode("utf-8")) > 72:
            return jsonify({
                "success": False,
                "message": "Password must not exceed 72 bytes."
            }), 400

        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        connection = get_db_connection()

        with connection.cursor() as cursor:
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

        logger.info("New user registered successfully.")

        return jsonify({
            "success": True,
            "message": "Account created successfully!",
            "user": {
                "id": user[0],
                "fullName": user[1],
                "email": user[2]
            }
        }), 201

    except psycopg2.errors.UniqueViolation:
        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "message": "An account with this email already exists."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        logger.exception("Signup failed.")

        return jsonify({
            "success": False,
            "message": "Unable to create account. Please try again."
        }), 500

    finally:
        if connection:
            connection.close()


# --------------------------------------------------
# Login
# --------------------------------------------------

@app.route("/login", methods=["POST"])
def login():
    connection = None

    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No valid data received."
            }), 400

        email = data.get("email", "")
        password = data.get("password", "")

        if not isinstance(email, str) or not isinstance(password, str):
            return jsonify({
                "success": False,
                "message": "Invalid input format."
            }), 400

        email = email.strip().lower()

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required."
            }), 400

        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, full_name, email, password_hash
                FROM users
                WHERE email = %s;
                """,
                (email,)
            )

            user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        user_id, full_name, user_email, password_hash = user

        password_is_correct = bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )

        if not password_is_correct:
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        logger.info("User login successful.")

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": {
                "id": user_id,
                "fullName": full_name,
                "email": user_email
            }
        }), 200

    except Exception:
        logger.exception("Login failed.")

        return jsonify({
            "success": False,
            "message": "Unable to log in. Please try again."
        }), 500

    finally:
        if connection:
            connection.close()


# --------------------------------------------------
# Start Flask locally
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
