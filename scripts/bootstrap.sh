#!/bin/bash
set -e

SERVER_IP="163.192.117.50"
SSH_KEY="$HOME/.ssh/lab1-key.pem"

echo "======================================"
echo " Lab 2 – Ansible Bootstrap"
echo "======================================"
echo ""

echo "[1/4] Checking for Ansible..."
if ! command -v ansible &>/dev/null; then
    echo "  Ansible not found. Installing..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update -qq && sudo apt install -y ansible
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ansible
    else
        echo "  ERROR: Install Ansible manually: https://docs.ansible.com/ansible/latest/installation_guide/"
        exit 1
    fi
fi
echo "  Ansible $(ansible --version | head -1 | awk '{print $NF}') found."

echo "[2/4] Checking SSH key..."
if [ ! -f "$SSH_KEY" ]; then
    echo "  ERROR: SSH key not found at $SSH_KEY"
    echo "  Copy your Lab 1 key there: cp ~/Downloads/ssh-key-*.key $SSH_KEY && chmod 600 $SSH_KEY"
    exit 1
fi
chmod 600 "$SSH_KEY"
echo "  SSH key OK: $SSH_KEY"

echo "[3/4] Testing connection to $SERVER_IP..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
       -o BatchMode=yes "sysadmin@$SERVER_IP" "echo connected" &>/dev/null; then
    echo "  Connection successful."
else
    echo "  ERROR: Cannot connect to sysadmin@$SERVER_IP"
    echo "  Make sure the server is running and the key is correct."
    exit 1
fi

echo "[4/4] Running Ansible ping test..."
ansible webservers -i ansible/inventory.ini -m ping

echo ""
echo "======================================"
echo " BOOTSTRAP COMPLETE"
echo " Run the full deployment with:"
echo "   bash scripts/deploy.sh"
echo "======================================"
