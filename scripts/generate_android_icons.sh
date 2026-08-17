#!/bin/bash
# Script de génération des icônes Android FASO EXPRESS à partir du logo officiel

LOGO_SRC="public/LOGOFASOEXPRESS A.png"

if [ ! -f "$LOGO_SRC" ]; then
  echo "Erreur: Le fichier source $LOGO_SRC n'existe pas."
  exit 1
fi

echo "Génération des icônes Android à partir de $LOGO_SRC..."

# Définition des dossiers mipmap et de leurs tailles respectives
declare -A RESOLUTIONS
RESOLUTIONS=(
  ["mipmap-ldpi"]="36"
  ["mipmap-mdpi"]="48"
  ["mipmap-hdpi"]="72"
  ["mipmap-xhdpi"]="96"
  ["mipmap-xxhdpi"]="144"
  ["mipmap-xxxhdpi"]="192"
)

for folder in "${!RESOLUTIONS[@]}"; do
  SIZE="${RESOLUTIONS[$folder]}"
  DIR="android/app/src/main/res/$folder"
  
  if [ -d "$DIR" ]; then
    echo "Génération pour $folder ($SIZE x $SIZE)..."
    
    # 1. Icône carrée standard
    convert "$LOGO_SRC" -resize "${SIZE}x${SIZE}!" "$DIR/ic_launcher.png"
    
    # 2. Icône ronde
    # Création d'un masque de cercle transparent de taille $SIZE
    convert "$LOGO_SRC" -resize "${SIZE}x${SIZE}!" \
      -background none \
      \( +clone -alpha extract \
         -draw "fill black polygon 0,0 0,$SIZE $SIZE,$SIZE $SIZE,0 fill white circle $(($SIZE/2)),$(($SIZE/2)) $(($SIZE/2)),0" \
         -alpha off \) \
      -compose CopyOpacity -composite "$DIR/ic_launcher_round.png"
  else
    echo "Dossier $DIR introuvable, ignoré."
  fi
done

echo "Icônes Android régénérées avec succès !"
