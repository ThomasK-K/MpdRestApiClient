#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;35m'
NC='\033[0m' # No Color



echo -e "${BLUE}Erstelle Server-Zertifikat für Backend...${NC}"
openssl genrsa -out ./radioapp.key 2048

# Create certificate signing request (CSR)
cat > ./radioapp.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = req_ext

[req_distinguished_name]
C = DE
ST = Hessen
L = Kelkheim
O = TKK Development
OU = Development
CN = 192.168.10.161

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 192.168.10.161
IP.1 = 127.0.0.1
IP.2 = 192.168.10.161
EOF

# Create CSR with the configuration
openssl req -new -key ./radioapp.key -out ./radioapp.csr -config ./radioapp.conf

# Sign the server certificate with our CA
openssl x509 -req -in ./radioapp.csr -CA ./rootCA.crt -CAkey ./rootCA.key -CAcreateserial -out ./radioapp.crt -days 1825 -sha256 -extensions req_ext -extfile ./radioapp.conf

echo -e "${GREEN}Server-Zertifikat erfolgreich erstellt:${NC} ./radioapp.crt"
echo -e "${GREEN}Server-Schlüssel erfolgreich erstellt:${NC} ./radioapp.key"

cp ./radioapp.crt ./cert.pem
cp ./radioapp.key ./key.pem

echo -e "${GREEN}Zertifikate für die Entwicklungsumgebung kopiert:${NC} ./radioapp.pem"

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}Installationsanleitung für Root-Zertifikat:${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo -e "1. Importieren Sie die Datei ${GREEN}./ssl/rootCA/rootCA.crt${NC} in Ihrem Browser oder Betriebssystem"
echo -e "2. Für Chrome unter Linux: Einstellungen -> Sicherheit und Datenschutz -> Sicherheit -> Zertifikate verwalten -> Behörden -> Importieren"
echo -e "3. Für Firefox: Einstellungen -> Datenschutz & Sicherheit -> Zertifikate anzeigen -> Zertifizierungsstellen -> Importieren"
echo -e "4. Starten Sie Ihren Browser neu, nachdem Sie das Zertifikat installiert haben"
echo -e "${BLUE}=======================================================${NC}"
