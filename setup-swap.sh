#!/bin/bash
# Auto setup 2GB swap on Ubuntu

SWAPFILE="/swapfile"
SWAPSIZE="2G"

echo ">>> Creating $SWAPSIZE swap file at $SWAPFILE ..."

# 1. Create swap file
sudo fallocate -l $SWAPSIZE $SWAPFILE || sudo dd if=/dev/zero of=$SWAPFILE bs=1M count=2048

# 2. Set permissions
sudo chmod 600 $SWAPFILE

# 3. Make swap
sudo mkswap $SWAPFILE

# 4. Enable swap
sudo swapon $SWAPFILE

# 5. Add to /etc/fstab if not already
if ! grep -q "$SWAPFILE" /etc/fstab; then
    echo "$SWAPFILE none swap sw 0 0" | sudo tee -a /etc/fstab
fi

# 6. Set swappiness
sudo sysctl vm.swappiness=10
if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
fi

echo ">>> Swap setup complete!"
swapon --show
free -h
cat /proc/sys/vm/swappiness
