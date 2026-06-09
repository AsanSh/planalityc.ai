#!/bin/bash
# Авто-пуш после каждого коммита (запускается launchd на Mac)
REPO="/Users/asans/Documents/табель/planalityc.ai"
LOG="$REPO/.git/auto-push.log"

cd "$REPO" || exit 1

# Проверяем что есть что пушить
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "[$(date '+%H:%M:%S')] pushing $LOCAL..." >> "$LOG"
  git push origin main >> "$LOG" 2>&1
  echo "[$(date '+%H:%M:%S')] done" >> "$LOG"
fi
