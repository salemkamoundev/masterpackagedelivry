#!/bin/bash

# Nom du fichier de sortie
OUTPUT_FILE="projet_angular_complet.txt"

# Vider le fichier s'il existe déjà
> "$OUTPUT_FILE"

echo "Début de la concaténation dans $OUTPUT_FILE..."

# Recherche des fichiers dans le dossier src
# On inclut : .ts, .html, .scss, .css, .json
# On exclut : le dossier assets (images, etc.) et favicon.ico
find src -type f \
    \( -name "*.ts" -o -name "*.html" -o -name "*.scss" -o -name "*.css" -o -name "*.json" \) \
    -not -path "*/assets/*" \
    -not -name "favicon.ico" \
    | while read file; do

    # Ajout d'une séparation visuelle et du nom du fichier
    echo "==============================================================================" >> "$OUTPUT_FILE"
    echo "FICHIER : $file" >> "$OUTPUT_FILE"
    echo "==============================================================================" >> "$OUTPUT_FILE"
    
    # Ajout du contenu du fichier
    cat "$file" >> "$OUTPUT_FILE"
    
    # Ajout de sauts de ligne pour la lisibilité
    echo -e "\n\n" >> "$OUTPUT_FILE"

    echo "Ajouté : $file"
done

echo "✅ Terminé ! Tout le code est dans : $OUTPUT_FILE"