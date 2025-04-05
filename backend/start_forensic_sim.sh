#!/bin/bash

LOGFILE="/logs/forensic.log"
REGFILE="/tmp/fake_registry.txt"
DOCS="/docs"

echo "$(date): Starting simulation of PDF execution." >> "$LOGFILE"

for pdf in "$DOCS"/*.pdf; do
  if [ -f "$pdf" ]; then
    echo "$(date): Processing $pdf" >> "$LOGFILE"
    cat "$pdf" >> "$LOGFILE"
  else
    echo "$(date): No PDF files found in $DOCS." >> "$LOGFILE"
  fi
done

echo "Original registry key: safe" > "$REGFILE"
sleep 2
echo "Malicious modification: registry key overwritten!" >> "$REGFILE"
sleep 5

echo "$(date): Starting forensic analysis." >> "$LOGFILE"
echo "Fake registry state:" >> "$LOGFILE"
cat "$REGFILE" >> "$LOGFILE"
echo "Recent dmesg output:" >> "$LOGFILE"
dmesg | tail -n 20 >> "$LOGFILE"

# Forensic tools
for pdf in "$DOCS"/*.pdf; do
  echo "Binwalk output for $pdf:" >> "$LOGFILE"
  binwalk "$pdf" >> "$LOGFILE" 2>&1

  echo "Exiftool output for $pdf:" >> "$LOGFILE"
  exiftool "$pdf" >> "$LOGFILE" 2>&1

  echo "Foremost output for $pdf:" >> "$LOGFILE"
  foremost -i "$pdf" -o /tmp/foremost_output >> "$LOGFILE" 2>&1
  rm -rf /tmp/foremost_output
done

echo "Running chkrootkit:" >> "$LOGFILE"
chkrootkit >> "$LOGFILE" 2>&1

echo "Running rkhunter:" >> "$LOGFILE"
rkhunter --check --sk >> "$LOGFILE" 2>&1

echo "Running lsof (open files):" >> "$LOGFILE"
lsof -n | head -n 20 >> "$LOGFILE"

echo "Running netstat:" >> "$LOGFILE"
netstat -tulnp >> "$LOGFILE" 2>&1 || echo "netstat not available" >> "$LOGFILE"

echo "Running ps aux:" >> "$LOGFILE"
ps aux >> "$LOGFILE"

echo "Done. Log written to $LOGFILE"
