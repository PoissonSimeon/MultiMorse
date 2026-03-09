#!/bin/bash

# Se place automatiquement dans le dossier où se trouve ce script bash
cd "$(dirname "$0")"

SCRIPT_NAME="MultiMorse.js"

echo "========================================="
echo "  Démarrage du Serveur MultiMorse SDR"
echo "========================================="

# 1. Vérification de l'installation de Node.js
if ! command -v node &> /dev/null; then
    echo "[Erreur] Node.js n'est pas installé sur ce système."
    echo "Veuillez l'installer avec : apt install nodejs npm"
    exit 1
fi

# 2. Installation automatique des dépendances si absentes
if [ ! -d "node_modules" ] || ! grep -q '"ws"' package.json 2>/dev/null; then
    echo "[Info] Dépendances manquantes. Installation du module WebSocket (ws)..."
    # Initialisation silencieuse d'un package.json s'il n'existe pas
    if [ ! -f "package.json" ]; then npm init -y > /dev/null 2>&1; fi
    
    npm install ws
    if [ $? -ne 0 ]; then
        echo "[Erreur] L'installation des dépendances a échoué."
        exit 1
    fi
    echo "[Info] Dépendances installées avec succès."
fi

# 3. Lancement avec boucle d'auto-guérison (Auto-Restart)
echo "[Info] Lancement de $SCRIPT_NAME avec une limite de RAM de 256 Mo..."

while true; do
    # L'option --max-old-space-size=256 est vitale pour un environnement léger comme Proxmox
    node --max-old-space-size=256 "$SCRIPT_NAME"
    
    # Si on arrive ici, c'est que l'application Node.js s'est fermée ou a crashé
    EXIT_CODE=$?
    echo "[Attention] Le serveur s'est arrêté avec le code $EXIT_CODE."
    echo "[Info] Redémarrage automatique dans 5 secondes (Appuyez sur Ctrl+C pour annuler)..."
    sleep 5
done
