#!/bin/bash

# Destroy vagrant without prompting
vagrant destroy -f

sleep 2

# (Optional: Repeat destroy if needed)
vagrant destroy -f

# Start vagrant
vagrant up --provider=qemu

# Wait for the VM to be ready
echo "Waiting for the VM to be ready..."
while ! vagrant ssh -c "echo 'VM is ready'" &> /dev/null; do
    sleep 5
done

# Clear the terminal screen
clear

# Ensure the ./logs directory exists
mkdir -p ./logs

# Get current UTC timestamp in the format YYYYMMDDTHHMMSSZ (e.g., 20250404T185500Z)
utc_timestamp=$(date -u +"%Y%m%dT%H%M%SZ")

# Run the remote command via vagrant ssh and save output locally with a unique filename
log_file="./logs/forensic_${utc_timestamp}.log"
vagrant ssh -c "cat /var/log/forensics/forensic.log" > "$log_file"

# Optionally, display the log contents
cat "$log_file"
