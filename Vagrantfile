# Vagrantfile for an automated forensic simulation using QEMU
Vagrant.configure("2") do |config|
  # Use the Ubuntu 22.04 ARM64 box
  config.vm.box = "perk/ubuntu-2204-arm64"

  # Sync the local "./docs" folder to the guest at /home/ubuntu/docs using rsync
  config.vm.synced_folder "./docs", "/home/ubuntu/docs", type: "rsync"

  # QEMU provider configuration
  config.vm.provider "qemu" do |qe|
    qe.ssh_port = "50022"  # Change SSH port as needed
  end

  # Provisioning script to set up the forensic simulation
  config.vm.provision "shell", inline: <<-SHELL
    # Update packages and install forensic tools and dependencies
    sudo apt-get update
    sudo apt-get install -y sleuthkit autopsy python3-pip binwalk foremost bulk-extractor libimage-exiftool-perl chkrootkit rkhunter

    # Install volatility3 via pip
    sudo pip3 install volatility3

    # Create directory for forensic logs
    sudo mkdir -p /var/log/forensics

    # Create the forensic simulation script that will run automatically
    cat << 'EOF' | sudo tee /home/ubuntu/start_forensic_sim.sh
#!/bin/bash
LOGFILE="/var/log/forensics/forensic.log"
REGFILE="/tmp/fake_registry.txt"

# Immediately simulate the malicious PDF execution for each PDF file found
echo "\$(date): Starting simulation of PDF execution." >> "\$LOGFILE"
for pdf in /home/ubuntu/docs/*.pdf; do
  if [ -f "\$pdf" ]; then
    echo "\$(date): Processing \$pdf" >> "\$LOGFILE"
    # "Open" the PDF by reading its content into the log (simulate execution)
    cat "\$pdf" >> "\$LOGFILE"
  else
    echo "\$(date): No PDF files found in /home/ubuntu/docs." >> "\$LOGFILE"
  fi
done

# Simulate a "registry" change (or critical configuration) that gets modified
echo "Original registry key: safe" > "\$REGFILE"
sleep 2
echo "Malicious modification: registry key overwritten!" >> "\$REGFILE"

# Wait 10 seconds to simulate delay after the malicious action
sleep 10

# Forensic analysis: capture the fake registry state and recent system messages
echo "\$(date): Starting forensic analysis." >> "\$LOGFILE"
echo "Fake registry state:" >> "\$LOGFILE"
cat "\$REGFILE" >> "\$LOGFILE"
echo "Recent dmesg output:" >> "\$LOGFILE"
dmesg | tail -n 20 >> "\$LOGFILE"

# ----- Additional Forensic Tool Outputs -----
# Run binwalk on each PDF
echo "\$(date): Running binwalk on PDFs:" >> "\$LOGFILE"
for pdf in /home/ubuntu/docs/*.pdf; do
  echo "Binwalk output for \$pdf:" >> "\$LOGFILE"
  binwalk "\$pdf" >> "\$LOGFILE" 2>&1
done

# Run chkrootkit
echo "\$(date): Running chkrootkit:" >> "\$LOGFILE"
chkrootkit >> "\$LOGFILE" 2>&1

# Run rkhunter (suppress interactive prompt with --sk flag)
echo "\$(date): Running rkhunter:" >> "\$LOGFILE"
rkhunter --check --sk >> "\$LOGFILE" 2>&1

# Run bulk_extractor on each PDF
echo "\$(date): Running bulk_extractor on PDFs:" >> "\$LOGFILE"
for pdf in /home/ubuntu/docs/*.pdf; do
  echo "bulk_extractor output for \$pdf:" >> "\$LOGFILE"
  bulk_extractor "\$pdf" >> "\$LOGFILE" 2>&1
done

# Run exiftool on each PDF
echo "\$(date): Running exiftool on PDFs:" >> "\$LOGFILE"
for pdf in /home/ubuntu/docs/*.pdf; do
  echo "Exiftool output for \$pdf:" >> "\$LOGFILE"
  exiftool "\$pdf" >> "\$LOGFILE" 2>&1
done

# Run foremost on each PDF (using a temporary output directory)
echo "\$(date): Running foremost on PDFs:" >> "\$LOGFILE"
for pdf in /home/ubuntu/docs/*.pdf; do
  echo "Foremost output for \$pdf:" >> "\$LOGFILE"
  foremost -i "\$pdf" -o /tmp/foremost_output >> "\$LOGFILE" 2>&1
  rm -rf /tmp/foremost_output
done
# ----- End Additional Forensic Tool Outputs -----

# Automatically copy the forensic log to the synced folder if it exists
if [ -f "\$LOGFILE" ]; then
  sudo cp "\$LOGFILE" /home/ubuntu/docs/forensic.log
  sudo chown vagrant:vagrant /home/ubuntu/docs/forensic.log
else
  echo "\$LOGFILE does not exist"
fi
EOF

    # Make the simulation script executable
    sudo chmod +x /home/ubuntu/start_forensic_sim.sh

    # Create a systemd service to run the simulation automatically at boot
    sudo bash -c 'cat << "EOF" > /etc/systemd/system/forensic-sim.service
[Unit]
Description=Automated Forensic Simulation Service
After=network.target

[Service]
Type=simple
ExecStart=/home/ubuntu/start_forensic_sim.sh

[Install]
WantedBy=multi-user.target
EOF'

    # Enable and start the forensic simulation service
    sudo systemctl daemon-reload
    sudo systemctl enable forensic-sim.service
    sudo systemctl start forensic-sim.service
  SHELL
end
