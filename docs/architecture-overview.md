# Lab 2 – Architecture Overview
**Student:** Althea Barbato
**Date:** June 23, 2026

---

## How it all fits together

```
  ┌────────────────────────────────────────────────────────────┐
  │              MY LAPTOP (control machine, via WSL)           │
  │                                                              │
  │   lab2/ansible/site.yml      ← the playbook I actually run  │
  │   lab2/ansible/roles/        ← baseline, webserver,         │
  │                                 logging, monitoring          │
  │   lab2/scripts/deploy.sh     ← wraps the ansible-playbook    │
  │                                 command + runs verification  │
  └───────────────────┬──────────────────────────────────────────┘
                      │  SSH (key-only, port 22)
                      ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                    webserver01                                │
  │             Oracle Cloud, Ubuntu Server 20.04 LTS              │
  │             163.192.117.50                                    │
  │                                                                 │
  │  UFW firewall   │   NGINX :80     │   node_exporter :9100      │
  │  SSH key-only   │   Fail2Ban      │   rsyslog + logrotate       │
  │                                                                 │
  │  logs in: /var/log/nginx/, /var/log/auth.log, /var/log/syslog  │
  └─────────────────────────────────────────────────────────────────┘
```

## What each role actually does

- **baseline** — runs first, every time. Updates packages, locks down SSH, sets up UFW, fixes a hidden iptables issue (more on that below), gets Fail2Ban running, turns on auto security updates.
- **webserver** — installs NGINX and pushes out my landing page from a template.
- **logging** — sets up rsyslog so logs are actually structured, and configures rotation so they don't pile up forever (30 days, then they get compressed and eventually deleted).
- **monitoring** — installs Prometheus node_exporter, which exposes a bunch of system metrics (CPU, memory, disk, etc.) on port 9100 so something like Prometheus or Grafana could scrape it later.

I made baseline run first on purpose — same reasoning as Lab 1, where I hardened SSH before turning anything else on. With Ansible doing everything in one shot there's no manual step in between to double check security is in place, so it has to be first in the playbook itself.

There's also a step before any of the roles run that installs Python 3.9 on the server if it's not already there — using Ansible's `raw` module, which is basically just running a plain SSH command, no Python required. I needed this because the server's default Python (3.8) is too old for the version of Ansible I'm using, and I didn't want that to be a manual step I had to remember to do by hand.

## Security stuff I built in

- SSH is key-only, no root login, no passwords — handled through a config file dropped into `sshd_config.d`
- UFW defaults to deny everything incoming, only opens the ports that are actually needed (22, 80, 443, 9100)
- Fail2Ban watches for failed SSH logins and bans IPs automatically
- Automatic security patching through unattended-upgrades
- node_exporter runs as its own system user with no shell and no home directory — if there's ever a vulnerability in it, there's nowhere for an attacker to go from there
- NGINX has security headers turned on and hides its version number in responses
- There's also a second iptables-level firewall rule set that mirrors the UFW rules (explained below) and a Fail2Ban exemption list so I don't accidentally lock myself out while testing

## Two things that bit me that I want to explain here too

**The iptables thing.** This server has an extra firewall layer underneath UFW that I didn't know about until I hit it. It's a leftover from Lab 1 — I had to manually add iptables rules back then to get ports 80 and 443 working because Oracle's base image apparently ships with a default-reject rule sitting in front of UFW's own chain. The problem is that rule only knew about 80, 443, and 22. When I opened port 9100 through UFW for node_exporter, UFW said it was fine, but the metrics endpoint still wasn't reachable from outside — that other layer was silently rejecting it first. I added a step to the baseline role that keeps this in sync automatically now, so any port I add to my settings file gets opened at both layers, and made it persist across reboots.

**The idempotency thing with packages.** I originally used Ansible's built-in `apt` module to install packages, which is supposed to be the "proper" idempotent way to do it. Except it broke — turns out that module needs a library called `python3-apt` that's only built for the system's default Python (3.8), not the 3.9 I had to install. So instead, those tasks just call `apt-get` directly through a shell command, and I check the output for the words "Setting up" to figure out whether anything actually changed, so it still reports correctly when nothing needed to be installed.

Other than that, the idempotency is pretty standard Ansible stuff — files only get rewritten if their contents actually changed, the node_exporter binary only gets downloaded if it's not already there, and the iptables/UFW rules check if they already exist before adding themselves again.
