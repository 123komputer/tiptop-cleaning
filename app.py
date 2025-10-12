from __future__ import annotations
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import os

app = Flask(__name__)

SITE_NAME = "TipTop Cleaning"

# --- Treści wspólne ---
SERVICES = [
    {"name": "Mieszkania i domy", "desc": "Regularne i jednorazowe sprzątanie przestrzeni mieszkalnych.",
     "features": ["Odkurzanie i mycie podłóg", "Łazienki i kuchnie", "Odkurzanie mebli i kurzu"]},
    {"name": "Biura i obiekty", "desc": "Utrzymanie czystości w biurach i lokalach usługowych.",
     "features": ["Biurka i sprzęt", "Strefy wspólne", "Kosze, kuchnie, toalety"]},
    {"name": "Po remoncie", "desc": "Dokładne porządki po pracach budowlanych i remontowych.",
     "features": ["Usuwanie pyłu", "Mycie okien i powierzchni", "Detale i wykończenie"]},
]

# Cennik dedykowany dla domu
PRICING_DOM = [
    {"tier": "Małe mieszkanie", "price": "od 149 zł", "includes": ["do 40 m²", "łazienka + kuchnia", "odkurzanie/mopowanie"]},
    {"tier": "Mieszkanie/DOM", "price": "od 199 zł", "includes": ["40–80 m²", "pełny zakres", "sprzęty kuchenne z zewnątrz"]},
    {"tier": "Większe metraże", "price": "wycena", "includes": [">80 m²", "szczegółowy zakres", "elastyczny harmonogram"]},
]

# Cennik dedykowany dla firm
PRICING_FIRMY = [
    {"tier": "Biuro do 100 m²", "price": "od 299 zł", "includes": ["stanowiska, kuchnia, toalety", "1× tygodniowo", "materiały w cenie"]},
    {"tier": "Biuro 100–300 m²", "price": "wycena", "includes": ["strefy wspólne + sale", "2–5× tygodniowo", "checklista jakości"]},
    {"tier": "Hale/Obiekty", "price": "wycena", "includes": ["ciągi komunikacyjne", "zaplecza socjalne", "godziny nocne/poranne"]},
]

OPINIONS = [
    {"text": "Szybko, dokładnie i w świetnej cenie. Polecam!", "author": "Magda K."},
    {"text": "Biuro wygląda jak nowe po każdej wizycie.", "author": "Studio Projektowe NXT"},
    {"text": "Najlepsza ekipa w Bydgoszczy — terminowo i bez stresu.", "author": "Robert P."},
]

IMGS = [
    'received_1764200134043779.jpeg','received_1387125268876607.jpeg','received_1326695504877025.jpeg',
    'received_1382414045719405.jpeg','received_1450696182458984.jpeg','received_1499422543932267.jpeg',
    'received_877042987220165.jpeg','received_881544973237244.jpeg','received_816137340260741.jpeg',
    'received_853936879562580.jpeg','received_1040783643834362.jpeg','received_1044921523418478.jpeg',
    'received_346641611350962.jpeg','received_348338341216645.jpeg','received_356893576876111.jpeg',
    'received_652366727074781.jpeg','received_785696316657938.jpeg','received_307404575394218.jpeg'
]

VIDS = [
    'received_847599253556482.mp4',
    'received_1040979100384379.mp4',
    'received_1052164972896316.mp4'
]

# --- Zmienne globalne do szablonów ---
@app.context_processor
def inject_globals():
    return {"site_name": SITE_NAME, "year": datetime.now().year}

# --- Trasy ---
@app.route("/")
def index():
    return render_template(
        "index.html",
        title="TipTop Cleaning – sprzątanie domów i biur w Bydgoszczy",
        services=SERVICES,
        opinions=OPINIONS,
    )

@app.route("/galeria")
def gallery():
    return render_template(
        "gallery.html",
        title="Galeria – TipTop Cleaning",
        imgs=IMGS,
        vids=VIDS,
    )

@app.route("/dla-domu")
def dla_domu():
    return render_template(
        "dla_domu.html",
        title="Sprzątanie dla domu – TipTop Cleaning",
        pricing=PRICING_DOM,
    )

@app.route("/dla-firm")
def dla_firm():
    return render_template(
        "dla_firm.html",
        title="Sprzątanie dla firm – TipTop Cleaning",
        pricing=PRICING_FIRMY,
    )

@app.route("/wycena")
def wycena():
    # Osobna strona wyceny (formularz z wyborem segmentu + kontakt/WhatsApp)
    return render_template(
        "wycena.html",
        title="Bezpłatna wycena – TipTop Cleaning",
    )

# --- API kontaktu ---
@app.post("/api/kontakt")
def api_kontakt():
    data = request.get_json(force=True, silent=True) or {}
    if not data.get("name") or not data.get("email"):
        return jsonify({"ok": False, "message": "Uzupełnij imię i email."}), 400

    segment = (data.get("segment") or "").strip().lower()
    if segment not in {"dom", "firma"}:
        segment = "ogólna"

    mail_to = os.getenv("MAIL_TO", "biuro@tiptopcleaning.pl")
    mail_from = os.getenv("MAIL_FROM", "no-reply@tiptopcleaning.pl")

    print("[KONTAKT]", {"segment": segment, **data})
    print(f"Wyślij e-mail do {mail_to} od {mail_from}: {data}")

    return jsonify({"ok": True, "message": f"Dziękujemy! Odezwiemy się w 24h (zapytanie: {segment})."})

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=int(os.getenv("PORT", 5000)))
