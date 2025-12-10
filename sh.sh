#!/bin/bash

# -------------------------------------------------------------------
# Script pour corriger l'erreur NG0200 liée au double ChatService
# -------------------------------------------------------------------

OLD_SERVICE="src/app/services/chat.service.ts"
NEW_SERVICE="src/app/core/services/chat.service.ts"

echo "=== Fix Angular ChatService (NG0200 Circular Dependency) ==="

# Vérifier si le fichier core existe (sécurité)
if [ ! -f "$NEW_SERVICE" ]; then
  echo "❌ ERREUR : Le fichier $NEW_SERVICE n'existe pas."
  echo "   Impossible de continuer."
  exit 1
fi

# Supprimer l'ancien ChatService s'il existe
if [ -f "$OLD_SERVICE" ]; then
  echo "➡️  Ancien service détecté : $OLD_SERVICE"
  echo "🗑  Suppression..."
  rm "$OLD_SERVICE"
  echo "✔ Ancien ChatService supprimé."
else
  echo "✔ Aucun ancien ChatService à supprimer (OK)."
fi

# Recherche de vieux imports
echo ""
echo "🔍 Recherche d'imports problématiques dans le projet..."
grep -R "src/app/services/chat.service" -n src/app

if [ $? -eq 0 ]; then
  echo "⚠️  Attention : certains fichiers importent encore l'ancien service."
  echo "➡️  Corrige manuellement les imports vers :"
  echo "    $NEW_SERVICE"
else
  echo "✔ Aucun import obsolète détecté."
fi

echo ""
echo "🎉 Correction terminée !"
echo "👉 Pense à relancer 'ng serve' pour un build propre."
