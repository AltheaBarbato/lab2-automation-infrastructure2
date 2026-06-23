# Lab 2 – Super Detailed Step-by-Step Guide

---

## What You're Doing

In Lab 1 you set up a server by running a bash script manually. This lab does the same thing (and more) using **Ansible**, which is a professional automation tool. Instead of you typing commands into the server, Ansible connects over SSH from your laptop and applies the configuration automatically.

This means you can run the same deployment command against any server and get identical results every time.

**What gets deployed:**
- Security baseline (SSH hardening, UFW firewall, Fail2Ban, auto-updates)
- NGINX web server with security headers
- Structured logging (rsyslog + log rotation)
- Prometheus node_exporter for metrics

**Time estimate:** 30–45 minutes

---

## PART 0 – What You'll Need

- Your Lab 1 SSH key file (`ssh-key-xxxx.key` from Oracle Cloud)
- Your Lab 1 server still running (`webserver01` at `163.192.117.50`)
- A Linux or macOS terminal — OR Windows with WSL (Windows Subsystem for Linux)
- Internet connection

> **Windows users:** You need WSL for this lab because Ansible doesn't run natively on Windows. If you don't have WSL, see Part 0.5 below.

---

## PART 0.5 – Install WSL (Windows only, skip on Mac/Linux)

1. Open **PowerShell as Administrator** (right-click Start → "Windows Terminal (Admin)")
2. Run:
   ```powershell
   wsl --install
   ```
3. Restart your computer when prompted
4. After restart, Ubuntu will open and ask you to create a username and password — set these to anything you'll remember
5. You now have a Linux terminal. Use this for everything below.

To open WSL in the future: search for "Ubuntu" in the Start menu.

---

## PART 1 – Install Ansible

Open your terminal (WSL on Windows, Terminal on Mac/Linux) and run:

```bash
sudo apt update && sudo apt install -y ansible
```

Verify it worked:
```bash
ansible --version
```
You should see something like `ansible [core 2.14.x]`.

---

## PART 2 – Set Up Your SSH Key

Your Ansible control machine needs the Lab 1 SSH key to connect to the server.

### On Windows (WSL):

Your Downloads folder is accessible from WSL. Find your key:
```bash
ls /mnt/c/Users/althea/Downloads/ssh-key-*.key
```

Copy it to the right place:
```bash
cp /mnt/c/Users/althea/Downloads/ssh-key-*.key ~/.ssh/lab1-key.pem
chmod 600 ~/.ssh/lab1-key.pem
```

### On Mac/Linux:

```bash
cp ~/Downloads/ssh-key-*.key ~/.ssh/lab1-key.pem
chmod 600 ~/.ssh/lab1-key.pem
```

Test it:
```bash
ssh -i ~/.ssh/lab1-key.pem sysadmin@163.192.117.50
```
You should get the server prompt. Type `exit` to leave.

---

## PART 3 – Navigate to the Lab 2 Folder

### On Windows (WSL):

Your Desktop is at `/mnt/c/Users/althea/Desktop/` in WSL:
```bash
cd /mnt/c/Users/althea/Desktop/labs-opensource/lab2
```

### On Mac/Linux:
```bash
cd ~/Desktop/labs-opensource/lab2
```

Verify you're in the right place:
```bash
ls
```
You should see: `ansible/  docs/  scripts/`

---

## PART 4 – Run Bootstrap

This checks that everything is in order before you deploy:

```bash
bash scripts/bootstrap.sh
```

Expected output (last few lines):
```
[4/4] Running Ansible ping test...
webserver01 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}

======================================
 BOOTSTRAP COMPLETE
 Run the full deployment with:
   bash scripts/deploy.sh
======================================
```

If you see `SUCCESS` and `pong`, you're ready. If you see an error, see the Troubleshooting section at the bottom.

---

## PART 5 – Run the Deployment

```bash
bash scripts/deploy.sh
```

You'll see Ansible output scrolling by. Each task will show either `ok` (already correct), `changed` (something was applied), or `failed` (something went wrong).

A successful first run will show lots of `changed` entries. A second run on the same server will show mostly `ok` — that's idempotency working.

The script automatically runs verification at the end. Look for:
```
======================================
 Results: 10 passed, 0 failed
======================================
```

This takes about 3–6 minutes on a fresh server (most of the time is the node_exporter download).

---

## PART 6 – Take Your Screenshots

### Screenshot 1 – Ansible Playbook Output

Scroll up in your terminal to the ansible-playbook run. Screenshot the section showing the role tasks completing, including the `PLAY RECAP` at the bottom. It should show:

```
PLAY RECAP ****
webserver01 : ok=XX  changed=XX  unreachable=0  failed=0
```

### Screenshot 2 – Verify Script Output

Run this:
```bash
bash scripts/verify.sh
```
Screenshot the full output showing all PASS results.

### Screenshot 3 – Services Running on the Server

SSH into the server:
```bash
ssh -i ~/.ssh/lab1-key.pem sysadmin@163.192.117.50
```

Then run:
```bash
for svc in nginx ssh fail2ban rsyslog node_exporter; do
  echo -n "$svc: "
  sudo systemctl is-active $svc
done
```
Screenshot the output showing `active` for all five services.

### Screenshot 4 – Firewall Rules

Still on the server, run:
```bash
sudo ufw status verbose
```
Screenshot showing UFW active with ports 22, 80, 443, and 9100 allowed.

### Screenshot 5 – Web Page in Browser

Open your browser and go to:
```
http://163.192.117.50
```
You should see the **"webserver01 – Lab 2"** page with the Ansible badge. Screenshot the browser with the address bar visible.

### Screenshot 6 – Metrics Endpoint

In your browser, go to:
```
http://163.192.117.50:9100/metrics
```
You should see a long page of Prometheus metrics starting with `# HELP`. Screenshot the top of this page showing the metrics output.

### Screenshot 7 – Idempotency Demo

Back in your terminal (not on the server), run the playbook a second time:
```bash
bash scripts/deploy.sh
```

Screenshot the `PLAY RECAP` at the end. This time it should show `changed=0` because everything is already in the correct state. This proves idempotency.

### Screenshot 8 – Log Files on the Server

SSH back in and run:
```bash
ls -lh /var/log/nginx/
sudo tail -10 /var/log/nginx/access.log
sudo tail -5 /var/log/auth.log
```
Screenshot showing the log files exist and have recent entries.

---

## PART 7 – What to Submit

| File | Submit as |
|------|-----------|
| `docs/deployment-documentation.md` | Deployment Documentation |
| `docs/architecture-overview.md` | Architecture Overview |
| `docs/reflection.md` | Reflection |
| `ansible/site.yml` + all role files | Git Repository (zip the whole lab2/ folder) |
| Your screenshots | Evidence / Screenshots |

---

## TROUBLESHOOTING

**"ansible: command not found"**
- Run `sudo apt install -y ansible` in WSL or Terminal

**Bootstrap fails at connectivity test**
- Make sure your server is still running in Oracle Cloud
- Confirm the key path: `ls ~/.ssh/lab1-key.pem`
- Confirm permissions: `chmod 600 ~/.ssh/lab1-key.pem`

**"UNREACHABLE" in Ansible output**
- Run `ssh -i ~/.ssh/lab1-key.pem sysadmin@163.192.117.50` manually to test
- If that works, the Ansible inventory might have a typo — check `ansible/inventory.ini`

**node_exporter task fails / download times out**
- The Oracle Cloud server needs outbound internet access to download from GitHub
- Run `curl -I https://github.com` on the server to test. If it times out, the VCN may not have an internet gateway — check Oracle Cloud networking settings

**Port 9100 not accessible in browser**
- This server has *three* firewall layers, and all three need a rule for the new port: UFW (handled automatically by the `baseline` role), an OS-level iptables filter that sits in front of UFW on this image (also handled automatically by the `baseline` role), and Oracle Cloud's network-level Security List (NOT handled by Ansible — this is outside the server). Add it manually in Oracle Cloud: VCN → Security Lists → Add Ingress Rule → TCP port 9100 from `0.0.0.0/0`
- Test from the server itself first: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9100/metrics`. If that returns `200` but the external `curl` from your laptop returns nothing or times out, the issue is one of the firewall layers above, not the service itself

**Wrong WSL distro / `sudo: not found`**
- If your terminal prompt doesn't say `Ubuntu` and basic commands like `sudo` are missing, you likely launched the wrong default WSL distro (e.g. a Docker Desktop internal VM)
- Run `wsl -l -v` in PowerShell to see installed distros, then `wsl --set-default Ubuntu` and reopen your terminal, or just always launch with `wsl -d Ubuntu` explicitly

**Locked out of SSH after running `verify.sh` a few times ("Connection refused")**
- `verify.sh` intentionally attempts a root login to confirm it's blocked — this is a real auth failure that Fail2Ban counts toward its ban threshold. Running verification repeatedly in a short window can trip a temporary ban on your own IP
- Wait ~10-15 minutes without attempting any more SSH connections, then retry. Once one full `ansible-playbook` run succeeds, the `fail2ban_ignoreip` whitelist for your control machine's IP (set in `ansible/vars/main.yml`) is applied and this won't happen again
- Avoid re-running `deploy.sh` (which auto-calls `verify.sh`) repeatedly while debugging — call `ansible-playbook -i ansible/inventory.ini ansible/site.yml` directly instead, and only run `verify.sh` once you expect it to pass

**Ansible fails with "Ansible requires Python 3.9 or newer on the target"**
- This server's default Python is 3.8. The playbook's `pre_tasks` step in `site.yml` should install `python3.9` automatically on first run using the `raw` module — if you still see this error, check that `ansible/inventory.ini` has `ansible_python_interpreter=/usr/bin/python3.9` set under `[webservers:vars]`

**`apt` module fails with a `python3-apt` import error**
- This is why the playbook's package-install tasks use `apt-get` via the `shell` module instead of Ansible's native `apt` module — the `python3-apt` C-extension isn't available for the Python 3.9 interpreter on this image. If you see this error, you're likely running an older version of the playbook before that fix

**Second deployment still shows `changed` for some tasks**
- This is normal for a few tasks like `apt upgrade` — it will show changed if there are new security packages available
- The key idempotency check is that services are not restarted and configurations are not overwritten when nothing has changed

---

## QUICK REFERENCE – Single Verification Block

Run this on the server to verify everything at once:
```bash
echo "=== HOSTNAME ===" && hostname
echo ""
echo "=== SERVICES ===" && for s in nginx ssh fail2ban rsyslog node_exporter; do echo -n "$s: "; sudo systemctl is-active $s; done
echo ""
echo "=== FIREWALL ===" && sudo ufw status verbose
echo ""
echo "=== WEB ===" && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost
echo ""
echo "=== METRICS ===" && curl -s -o /dev/null -w "node_exporter HTTP %{http_code}\n" http://localhost:9100/metrics
echo ""
echo "=== LOGS ===" && ls /var/log/nginx/ && echo "auth log: $(sudo wc -l < /var/log/auth.log) lines"
```
