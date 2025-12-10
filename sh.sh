#!/usr/bin/env bash
set -euo pipefail

# =========================
# CONFIG À ADAPTER
# =========================
PROJECT_ID="masterdeliverpackage"    # Ton ID de projet
REGISTRATION_BODY_FILE="${1:-}"     # Fichier JSON contenant le body de la requête

if [[ -z "$REGISTRATION_BODY_FILE" ]]; then
  echo "Usage: $0 chemin/vers/body.json"
  exit 1
fi

if [[ ! -f "$REGISTRATION_BODY_FILE" ]]; then
  echo "Fichier JSON introuvable : $REGISTRATION_BODY_FILE"
  exit 1
fi

echo "👉 Utilisation du projet GCP : $PROJECT_ID"
echo "👉 Lecture du body dans : $REGISTRATION_BODY_FILE"

# =========================
# 1. Récupérer un access token OAuth2 via gcloud
# =========================
echo "🔐 Récupération d'un access token OAuth2..."
ACCESS_TOKEN="$(gcloud auth application-default print-access-token)"

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "❌ Impossible de récupérer un access token. Vérifie ta config gcloud / ADC."
  exit 1
fi

echo "✅ Access token récupéré."

# =========================
# 2. Appel à l’API FCM Registrations HTTP v1
# =========================
FCM_URL="https://fcmregistrations.googleapis.com/v1/projects/${PROJECT_ID}/registrations"

echo "📡 Envoi de la requête vers : $FCM_URL"

HTTP_CODE="$(curl -sS -o response.json -w "%{http_code}" \
  -X POST "$FCM_URL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @"$REGISTRATION_BODY_FILE")"

echo "🌐 Code HTTP : $HTTP_CODE"
echo "📄 Réponse brute :"
cat response.json
echo
