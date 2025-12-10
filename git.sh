#!/bin/bash

echo "======================================================"
echo "  RESET TOTAL DE L'HISTORIQUE GIT"
echo "======================================================"

# 1. Créer une branche temporaire vide (sans parents/historique)
echo "1. Création d'une nouvelle branche vierge..."
git checkout --orphan temp_branch

# 2. Tout préparer (Staging)
echo "2. Ajout des fichiers..."
git add -A

# 3. VERIFICATION DE SECURITE CRITIQUE
# On force le retrait du fichier secret s'il a été ajouté par erreur
echo "3. Vérification de sécurité..."
git rm --cached serviceAccountKey.json 2>/dev/null
git rm --cached src/serviceAccountKey.json 2>/dev/null

# 4. Créer le premier commit propre
echo "4. Création du nouveau commit initial..."
git commit -m "Initial commit (Cleaned)"

# 5. Remplacer la branche main
echo "5. Remplacement de la branche main..."
git branch -D main   # Supprime l'ancienne main infectée
git branch -m main   # Renomme la branche temporaire en main

# 6. Forcer l'envoi vers GitHub
echo "6. Envoi forcé vers GitHub..."
echo "Attention : Ceci va écraser l'historique sur GitHub."
git push -f origin main

echo ""
echo "======================================================"
echo "✅ TERMINÉ !"
echo "Ton projet est propre et débloqué."
echo "======================================================"