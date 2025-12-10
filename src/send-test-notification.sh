#!/bin/bash

# ==========================================
# CONFIGURATION
# ==========================================
# 1. Collez votre CLÉ SERVEUR (Legacy) ici (commence par AAA...)
SERVER_KEY="COLLEZ_VOTRE_CLE_SERVEUR_ICI"

# 2. Collez le TOKEN du téléphone cible (celui affiché dans votre app Angular)
DEVICE_TOKEN="COLLEZ_LE_TOKEN_DU_CHAUFFEUR_ICI"
# ==========================================

if [ "$SERVER_KEY" == "COLLEZ_VOTRE_CLE_SERVEUR_ICI" ]; then
  echo "❌ Erreur : Vous devez mettre votre SERVER_KEY dans le script."
  exit 1
fi

if [ "$DEVICE_TOKEN" == "COLLEZ_LE_TOKEN_DU_CHAUFFEUR_ICI" ]; then
  echo "❌ Erreur : Vous devez mettre le DEVICE_TOKEN cible dans le script."
  exit 1
fi

echo "Quel type de notification tester ?"
echo "1. 🚖 Nouvelle Course (New Ride)"
echo "2. 💬 Message Chat"
read -p "Choix (1 ou 2) : " choice

if [ "$choice" == "1" ]; then
  # SCÉNARIO : NOUVELLE COURSE
  echo "🚀 Envoi d'une demande de trajet..."
  
  curl -X POST --header "Authorization: key=$SERVER_KEY" \
       --header "Content-Type: application/json" \
       https://fcm.googleapis.com/fcm/send \
       -d "{
         \"to\": \"$DEVICE_TOKEN\",
         \"notification\": {
           \"title\": \"Nouvelle Course !\",
           \"body\": \"Un client attend à Sfax Centre\"
         },
         \"data\": {
           \"type\": \"NEW_RIDE\",
           \"from\": \"Sfax Centre\",
           \"to\": \"Route de Tunis km 4\",
           \"price\": \"15\",
           \"rideId\": \"12345\"
         }
       }"

elif [ "$choice" == "2" ]; then
  # SCÉNARIO : CHAT
  echo "💬 Envoi d'un message..."
  
  curl -X POST --header "Authorization: key=$SERVER_KEY" \
       --header "Content-Type: application/json" \
       https://fcm.googleapis.com/fcm/send \
       -d "{
         \"to\": \"$DEVICE_TOKEN\",
         \"notification\": {
           \"title\": \"Message Client\",
           \"body\": \"Je suis devant la porte rouge.\"
         },
         \"data\": {
           \"type\": \"CHAT_MSG\",
           \"sender\": \"Ahmed (Client)\",
           \"content\": \"Je suis devant la porte rouge.\"
         }
       }"

else
  echo "Choix invalide."
fi

echo ""
echo "✅ Fait. Regardez votre application !"