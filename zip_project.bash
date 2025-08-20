#!/bin/bash
# Script zip project โดยไม่เอา node_modules และใส่วันเดือนปีในชื่อไฟล์

set -euo pipefail

DATE=$(date +%Y-%m-%d)
OUTDIR="."   # ใช้โฟลเดอร์ปัจจุบัน (root project)
FILENAME="project_$DATE.zip"

# ใช้ zip ถ้ามี
if command -v zip >/dev/null 2>&1; then
  zip -r "$OUTDIR/$FILENAME" . \
    -x "*/node_modules/*" \
    -x "Frontend/node_modules/*" \
    -x "Backend/node_modules/*"
  echo "✅ สร้างไฟล์เสร็จ: $OUTDIR/$FILENAME"
  exit 0
fi

# ถ้าไม่มี zip ใช้ tar
if command -v tar >/dev/null 2>&1; then
  TARFILE="$OUTDIR/project_$DATE.tar.gz"
  tar -czf "$TARFILE" \
    --exclude="*/node_modules/*" \
    --exclude="Frontend/node_modules/*" \
    --exclude="Backend/node_modules/*" \
    .
  echo "✅ สร้างไฟล์เสร็จ: $TARFILE"
  exit 0
fi

echo "❌ ไม่พบคำสั่ง zip หรือ tar ในเครื่อง กรุณาติดตั้ง zip (sudo apt-get install zip หรือ brew install zip)"
