#!/bin/bash
# deploy.sh – Runs the full Ansible deployment against webserver01
# Usage: bash scripts/deploy.sh [--check]  (--check for dry-run)
# Run from the lab2/ root directory

set -e

INVENTORY="ansible/inventory.ini"
PLAYBOOK="ansible/site.yml"
LOG_FILE="deploy-$(date +%Y%m%d-%H%M%S).log"

echo "======================================"
echo " Lab 2 – Automated Deployment"
echo " $(date)"
echo "======================================"
echo ""

if [[ "$1" == "--check" ]]; then
    echo "DRY-RUN MODE – no changes will be made"
    echo ""
    ansible-playbook -i "$INVENTORY" "$PLAYBOOK" --check --diff 2>&1 | tee "$LOG_FILE"
else
    echo "Running full deployment..."
    echo "Log: $LOG_FILE"
    echo ""
    ansible-playbook -i "$INVENTORY" "$PLAYBOOK" 2>&1 | tee "$LOG_FILE"
fi

echo ""
echo "======================================"
echo " DEPLOYMENT COMPLETE"
echo " Running verification..."
echo "======================================"
echo ""

bash scripts/verify.sh
