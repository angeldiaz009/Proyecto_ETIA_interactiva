import sqlite3
import os
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory

# Rutas exactas estando servidor.py dentro de /web
WEB_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(WEB_DIR)
DB_PATH = os.path.join(BASE_DIR, "etia_interactiva.db")

app = Flask(__name__, static_folder=WEB_DIR)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@app.route("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(WEB_DIR, filename)

# 2. API: Registro de Usuario en SQLite (RF-01)
@app.route("/api/registro", methods=["POST"])
def registro():
    data = request.json
    nombre = data.get("nombre")
    email = data.get("email")
    password = data.get("password")

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO usuarios (nombre, email, password, progreso_general) VALUES (?, ?, ?, 0.0)",
            (nombre, email, password)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return jsonify({
            "ok": True,
            "usuario": {
                "id_usuario": user_id,
                "nombre": nombre,
                "email": email,
                "progreso_general": 0,
                "modulosCompletados": [],
                "examenAprobado": False
            }
        })
    except sqlite3.IntegrityError:
        return jsonify({"ok": False, "mensaje": "Este correo ya está registrado."}), 400

# 3. API: Inicio de Sesión validando contra SQLite (RF-01)
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE email = ? AND password = ?", (email, password))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({"ok": False, "mensaje": "Correo o contraseña incorrectos. Regístrate si no tienes cuenta."}), 401

    # Consultar evaluaciones aprobadas del usuario
    cursor.execute("SELECT id_modulo FROM evaluaciones WHERE id_usuario = ? AND aprobado = 1", (user["id_usuario"],))
    aprobados = [row["id_modulo"] for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "ok": True,
        "usuario": {
            "id_usuario": user["id_usuario"],
            "nombre": user["nombre"],
            "email": user["email"],
            "progreso_general": user["progreso_general"],
            "modulosCompletados": aprobados,
            "examenAprobado": (4 in aprobados)
        }
    })

# 4. API: Guardar avance de módulo, examen y certificado en SQLite (RF-07, RF-08)
@app.route("/api/progreso", methods=["POST"])
def guardar_progreso():
    data = request.json
    id_usuario = data.get("id_usuario")
    id_modulo = data.get("id_modulo")
    calificacion = data.get("calificacion", 100.0)
    progreso_total = data.get("progreso_general")

    conn = get_db()
    cursor = conn.cursor()

    # Registrar evaluación si no existe aprobada
    cursor.execute("SELECT id_evaluacion FROM evaluaciones WHERE id_usuario = ? AND id_modulo = ? AND aprobado = 1", (id_usuario, id_modulo))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO evaluaciones (id_usuario, id_modulo, calificacion, aprobado) VALUES (?, ?, ?, 1)",
            (id_usuario, id_modulo, calificacion)
        )

    # Actualizar porcentaje en tabla usuarios
    cursor.execute("UPDATE usuarios SET progreso_general = ? WHERE id_usuario = ?", (progreso_total, id_usuario))

    # Generar certificado en SQLite si llegó al 100%
    if progreso_total >= 100:
        cursor.execute("SELECT id_certificado FROM certificados WHERE id_usuario = ?", (id_usuario,))
        if not cursor.fetchone():
            folio = f"ETIA-2026-UACM-{id_usuario:03d}"
            fecha = datetime.now().strftime("%Y-%m-%d")
            cursor.execute(
                "INSERT INTO certificados (id_usuario, folio_unico, fecha_emision) VALUES (?, ?, ?)",
                (id_usuario, folio, fecha)
            )

    conn.commit()
    conn.close()
    return jsonify({"ok": True})

if __name__ == "__main__":
    print("🚀 Servidor ETIA_interactiva activo en: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)