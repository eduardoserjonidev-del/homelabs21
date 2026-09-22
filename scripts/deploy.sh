#!/usr/bin/env bash

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

HOST="u0_a505@192.168.100.4"
PORT="8022"
REMOTE_DIR="/data/data/com.termux/files/home/lab/web/site"

echo "==> Publicando commit $(git rev-parse --short HEAD) no S21..."

# Pega somente arquivos web que fazem parte do commit atual.
mapfile -d '' FILES < <(
    git ls-tree -r -z --name-only HEAD |
    grep -zE '\.(html|css|js|json|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2)$'
)

if [ "${#FILES[@]}" -eq 0 ]; then
    echo "Nenhum arquivo web para publicar."
    exit 0
fi

# Cria um TAR diretamente do commit.
# Assim, arquivos alterados depois do commit não entram no deploy.
git archive --format=tar HEAD -- "${FILES[@]}" |
ssh -p "$PORT" "$HOST" "
    mkdir -p '$REMOTE_DIR' &&
    tar -xf - -C '$REMOTE_DIR'
"

# Permissões de leitura para o Nginx.
ssh -p "$PORT" "$HOST" "
    find '$REMOTE_DIR' -type f \
    \( -name '*.html' -o \
       -name '*.css' -o \
       -name '*.js' -o \
       -name '*.json' -o \
       -name '*.png' -o \
       -name '*.jpg' -o \
       -name '*.jpeg' -o \
       -name '*.webp' -o \
       -name '*.gif' -o \
       -name '*.svg' -o \
       -name '*.ico' -o \
       -name '*.woff' -o \
       -name '*.woff2' \) \
    -exec chmod 644 {} +
"

echo "==> Deploy concluído."
echo "==> https://homelabs21.duckdns.org"