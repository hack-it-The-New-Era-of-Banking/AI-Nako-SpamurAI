FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install live forensic tools
RUN apt-get update && apt-get install -y \
  sleuthkit autopsy binwalk foremost \
  libimage-exiftool-perl chkrootkit rkhunter \
  lsof net-tools psutils \
  && apt-get clean

# Create folders for script and logs
RUN mkdir -p /opt/scripts /var/log/forensics /logs

# Copy simulation script
COPY start_forensic_sim.sh /opt/scripts/start_forensic_sim.sh
RUN chmod +x /opt/scripts/start_forensic_sim.sh

# Set script to run on container startup
ENTRYPOINT ["/opt/scripts/start_forensic_sim.sh"]
