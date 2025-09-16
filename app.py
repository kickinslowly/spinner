
from flask import Flask, render_template, jsonify, request, send_from_directory
import os, json, threading

app = Flask(__name__)
DATA_FILE = os.path.join(app.instance_path, "wheels.json")
os.makedirs(app.instance_path, exist_ok=True)
_lock = threading.Lock()

def _read_data():
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _write_data(data):
    with _lock:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/wheel/<wheel_key>")
def wheel(wheel_key):
    # Template loads wheel by key either from query/localStorage or API
    return render_template("wheel.html", wheel_key=wheel_key)

@app.route("/api/wheels", methods=["GET"])
def list_wheels():
    return jsonify(_read_data())

@app.route("/api/wheels/<key>", methods=["GET"])
def get_wheel(key):
    data = _read_data()
    return jsonify(data.get(key) or {}), (200 if key in data else 404)

@app.route("/api/wheels/<key>", methods=["PUT", "POST"])
def save_wheel(key):
    payload = request.get_json(force=True, silent=True) or {}
    data = _read_data()
    data[key] = payload
    _write_data(data)
    return jsonify({"ok": True, "key": key})

@app.route("/api/wheels/<key>", methods=["DELETE"])
def delete_wheel(key):
    data = _read_data()
    if key in data:
        del data[key]
        _write_data(data)
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "not found"}), 404

@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static/img", "favicon.svg")

if __name__ == "__main__":
    app.run(debug=True)
