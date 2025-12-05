#!/bin/bash

# ==========================================
# SWITCH FIREBASE PROJECT
# Cible : masterdeliverpackage
# ==========================================

set -e # Arrêter si une erreur survient

TARGET_PROJECT="masterdeliverpackage"

echo "🔎 Vérification de la connexion à Firebase CLI..."
if ! command -v firebase &> /dev/null
then
    echo "❌ Erreur : Firebase CLI n'est pas installé. Veuillez l'installer avec 'npm install -g firebase-tools' et vous connecter avec 'firebase login'."
    exit 1
fi

echo "🔄 Tentative de basculement vers le projet : $TARGET_PROJECT"

# Basculer le projet Firebase local
firebase use $TARGET_PROJECT

# Vérifier si l'opération a réussi
if [ $? -eq 0 ]; then
    echo "✅ Basculement effectué avec succès !"
    echo "👉 Vous pouvez maintenant déployer sur le bon projet : firebase deploy --only hosting"
    echo "   N'oubliez pas de mettre à jour la configuration Firebase dans src/environments/environment.ts avec les clés de $TARGET_PROJECT si ce n'est pas déjà fait."
else
    echo "❌ Échec du basculement. Assurez-vous que le projet '$TARGET_PROJECT' existe et que votre compte a les permissions nécessaires."
fi