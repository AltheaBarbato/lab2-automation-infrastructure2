#!/bin/bash
# verify.sh – Post-deployment verification checks
# Runs against the live server to confirm all services are operational
# Usage: bash scripts/verify.sh

SERVER_IP="163.192.117.50"
SSH_KEY="$HOME/.ssh/lab1-key.pem"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
PASS=0
FAIL=0

check() {
    local label="$1"
    local result="$2"
    if [ "$result" = "pass" ]; then
        echo "  [PASS] $label"
        PASS=$((PASS + 1))
    else
        echo "  [FAIL] $label"
        FAIL=$((FAIL + 1))
    fi
}

echo "======================================"
echo " Lab 2 – Deployment Verification"
echo " Target: $SERVER_IP"
echo "======================================"
echo ""

echo "--- Connectivity ---"
ssh $SSH_OPTS "sysadmin@$SERVER_IP" "echo ok" &>/dev/null && \
    check "SSH access as sysadmin" pass || check "SSH access as sysadmin" fail

echo ""
echo "--- Services ---"
for svc in nginx ssh fail2ban rsyslog node_exporter; do
    status=$(ssh $SSH_OPTS "sysadmin@$SERVER_IP" "sudo systemctl is-active $svc" 2>/dev/null)
    [ "$status" = "active" ] && check "$svc running" pass || check "$svc running" fail
done

echo ""
echo "--- Firewall ---"
ufw_status=$(ssh $SSH_OPTS "sysadmin@$SERVER_IP" "sudo ufw status | head -1" 2>/dev/null)
[[ "$ufw_status" == *"active"* ]] && check "UFW enabled" pass || check "UFW enabled" fail

echo ""
echo "--- Web Service ---"
http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$SERVER_IP" 2>/dev/null)
[ "$http_code" = "200" ] && check "HTTP 200 from $SERVER_IP" pass || check "HTTP 200 from $SERVER_IP (got $http_code)" fail

echo ""
echo "--- Monitoring Endpoint ---"
metrics_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$SERVER_IP:9100/metrics" 2>/dev/null)
[ "$metrics_code" = "200" ] && check "node_exporter /metrics reachable" pass || check "node_exporter /metrics reachable (got $metrics_code)" fail

echo ""
echo "--- Security ---"
root_ssh=$(ssh $SSH_OPTS "root@$SERVER_IP" "echo ok" 2>&1)
[[ "$root_ssh" != "ok" ]] && check "root SSH login blocked" pass || check "root SSH login blocked" fail

echo ""
echo "======================================"
echo " Results: $PASS passed, $FAIL failed"
echo "======================================"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
