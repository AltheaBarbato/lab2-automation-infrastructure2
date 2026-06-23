# Lab 2 – Deployment Documentation
**Student:** Althea Barbato
**Date:** June 23, 2026

---

## What this is

This is the automation framework I built for Lab 2. Instead of SSHing into `webserver01` (same server from Lab 1) and typing commands one at a time, I wrote Ansible playbooks that do the whole setup for me — security baseline, NGINX, logging, and monitoring — and I can rerun the exact same command and get the exact same result every time.

## How the repo is laid out

```
lab2/
├── ansible/
│   ├── inventory.ini          tells Ansible which server to target
│   ├── site.yml               the main playbook, this is what you actually run
│   ├── vars/main.yml          all the settings in one place (ports, versions, etc)
│   └── roles/
│       ├── baseline/          SSH hardening, UFW, Fail2Ban, patching
│       ├── webserver/         NGINX + my landing page
│       ├── logging/           rsyslog + log rotation
│       └── monitoring/        Prometheus node_exporter
├── scripts/
│   ├── bootstrap.sh           checks everything's ready before you deploy
│   ├── deploy.sh               runs the playbook
│   └── verify.sh               checks everything actually worked after
└── docs/                      this stuff
```

## What you need before running this

- Linux, macOS, or WSL2 if you're on Windows — Ansible just doesn't run on Windows directly, I learned that the hard way
- Ansible installed (I'm on ansible-core 2.20, anything 2.14+ should be fine)
- The same SSH key from Lab 1 (`~/.ssh/lab1-key.pem`)
- The server itself — `webserver01`, IP `163.192.117.50`, and it's actually Ubuntu 20.04, not 24.04 like I had originally written down in my Lab 1 notes

One thing that tripped me up for a while: newer versions of Ansible just refuse to talk to a server running Python older than 3.9, and Ubuntu 20.04 ships with Python 3.8 by default. I ended up adding a step at the very top of `site.yml` that installs Python 3.9 automatically the first time it runs, using Ansible's `raw` module since that one doesn't need Python on the other end at all. So you shouldn't have to think about this anymore, but I'm leaving the explanation here because it took me forever to figure out what was actually going on.

## How to actually run it

**1. cd into the folder**
```bash
cd lab2
```

**2. Run bootstrap first** — this just makes sure Ansible's installed, your key works, and the server is reachable
```bash
bash scripts/bootstrap.sh
```
You want to see `"ping": "pong"` at the end.

**3. (optional) dry run** — shows you what would change without touching anything
```bash
bash scripts/deploy.sh --check
```

**4. Actually deploy**
```bash
bash scripts/deploy.sh
```
This connects over SSH and runs through four roles in order: baseline (security stuff first, always), then webserver, then logging, then monitoring.

**5. Verify** — the deploy script runs this automatically at the end anyway, but you can run it by itself too
```bash
bash scripts/verify.sh
```
When everything's working it looks like this:
```
======================================
 Results: 10 passed, 0 failed
======================================
```

## Problems I actually ran into (not hypothetical ones)

**Oracle has a second firewall you don't see.** I found this out the hard way — UFW said port 9100 was allowed, but I still couldn't reach the metrics endpoint from outside. Turns out there's an iptables rule sitting in front of UFW's own rules on this image (leftover from a fix I had to do manually back in Lab 1 to get ports 80/443 working) that just rejects anything not on its own little list. UFW has no idea this is happening — it'll happily tell you a port is open while this other layer silently drops the traffic before UFW ever sees it. I added a task to the baseline role that inserts a matching rule into that chain for every port, and made it stick across reboots with `iptables-persistent`.

**I locked myself out with my own verification script.** `verify.sh` tries to SSH in as root on purpose, to prove root login is actually blocked. Thing is, that's a real failed login attempt as far as Fail2Ban is concerned, and running the script a few times in a row while I was debugging something else was enough to get my own IP banned. Took me a minute to realize "Connection refused" meant I'd banned myself and not that something else had broken. Fixed it by adding my IP to a Fail2Ban exemption list that the baseline role now sets up automatically.

## Settings you can change

Everything configurable lives in `ansible/vars/main.yml` — server hostname, the IP, which ports get opened, what version of node_exporter to install, how long logs stick around, and my own IP for the Fail2Ban exemption. Change something there and rerun `deploy.sh`, no need to dig through the actual role files.

## If I want to change something later

Want to change the landing page? Just edit `ansible/roles/webserver/templates/index.html.j2` and redeploy — Ansible notices the file changed and pushes it. Want to open a new port? Add it to the `allowed_ports` list in vars and redeploy, it won't mess with the ports that are already open.

## What's actually running on the server now

| Service | Port | Why it's there |
|---------|------|-----------------|
| OpenSSH | 22 | how I get in, and how Ansible connects |
| NGINX | 80 | serves the landing page |
| UFW | — | firewall, default deny |
| Fail2Ban | — | bans IPs that fail login too many times |
| unattended-upgrades | — | installs security patches automatically |
| rsyslog | — | collects logs |
| node_exporter | 9100 | exposes system metrics for monitoring |
| iptables-persistent | — | keeps the OS-level firewall rules from disappearing on reboot |
