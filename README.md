# Lab 2 – Automation & Infrastructure Project
**Student:** Althea Barbato
**Date:** June 23, 2026

Ansible automation that sets up `webserver01` (same Oracle Cloud server from Lab 1) — security baseline, NGINX, logging, and monitoring, all through reusable playbooks instead of typing commands by hand.

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

## Docs

- [Architecture Overview](docs/architecture-overview.md)
- [Deployment Documentation](docs/deployment-documentation.md)
- [Reflection](docs/reflection.md)
- [Step-by-Step Guide](STEP-BY-STEP-GUIDE.md) — if you want to actually run this yourself

## Server

`webserver01` — Ubuntu Server 20.04 LTS, Oracle Cloud Always Free Tier, `163.192.117.50`, admin user `sysadmin` (key-only SSH, same key from Lab 1)
