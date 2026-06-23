# Lab 2 Automation & Infrastructure Project
**Name:** Althea Barbato

Ansible automation that sets up `webserver01` security baseline, NGINX, logging, and monitoring, all through reusable playbooks instead of typing commands by hand.

## Running it

```bash
bash scripts/bootstrap.sh        # checks Ansible + SSH are working
bash scripts/deploy.sh --check   # optional, shows what would change
bash scripts/deploy.sh           # actually deploys + verifies
```

## What it sets up

- **baseline** — SSH hardening, UFW firewall, Fail2Ban, auto security patching
- **webserver** — NGINX with my landing page
- **logging** — rsyslog + log rotation (30 days)
- **monitoring** — Prometheus node_exporter on port 9100


## Server

`webserver01` — Ubuntu Server 20.04 LTS, Oracle Cloud Always Free Tier, `163.192.117.50`, admin user `sysadmin` 
