#!/usr/bin/env bash

URL="https://homelabs21.duckdns.org"
LOG="$HOME/Projetos/s21-homelab/monitor/site-status.log"

DATE="$(date '+%Y-%m-%d %H:%M:%S')"

RESULT="$(curl \
    -sS \
    -o /dev/null \
    --connect-timeout 10 \
    -w '%{http_code} %{time_total}' \
    "$URL" 2>&1)"

echo "$DATE | $RESULT" >> "$LOG"
