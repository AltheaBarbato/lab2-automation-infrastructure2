# Lab 2 Reflection
**Student:** Althea Barbato
**Date:** June 23, 2026

---

## What Changed from Lab 1

Lab 1 was a single bash script that ran all the configuration steps in order. That approach worked for a one-time setup but had real limitations. If I ran it a second time it would try to recreate users that already existed, overwrite configurations that were already correct, and restart services unnecessarily. There was also no way to know in advance what it would change without just running it and seeing what happened.

Lab 2 replaces that with Ansible playbooks organized into four roles. Each role has a specific responsibility — baseline security, web service deployment, logging, and monitoring — and every task in every role is written to be idempotent. That means I can run the playbook against a fully configured server and it will report zero changes because everything is already in the desired state. That is a completely different operational model than a script that just executes commands top to bottom.

---

## Design Decisions

The biggest structural decision was organizing the automation into roles rather than one flat playbook. This made each piece independently readable and testable. If something breaks in the monitoring role it doesn't affect the webserver role, and I can target a single role during troubleshooting without touching the rest of the system.

I also chose to keep all configurable values in a single `vars/main.yml` file rather than scattering them through the playbook tasks. That means if I ever needed to deploy this to a different server I would only have to update the inventory and the variables file, not hunt through playbook logic to find hardcoded IP addresses or version numbers.

For monitoring I chose Prometheus node_exporter instead of a heavier stack. The free tier server only has 1 GB of RAM, so running a full Prometheus server and Grafana instance locally would be difficult. node_exporter exposes system metrics on port 9100 and can be scraped by an external Prometheus instance later, which means the monitoring architecture can grow without changing the server-side configuration.

---

## Challenges

I ran into more real obstacles in this lab than in Lab 1, mostly because automation surfaces problems that manual administration quietly papers over.

**Getting Ansible itself running.** Ansible doesn't run natively on Windows, so I had to set up WSL2 first. The default WSL distro on my machine turned out to be a Docker Desktop internal VM rather than Ubuntu, which I only noticed because `sudo` wasn't available and the filesystem paths looked wrong (`/mnt/host/c/...` instead of `/mnt/c/...`). Setting Ubuntu as the explicit default WSL distro fixed it.

**Python version mismatch on the target.** When I first ran the Ansible ping test, it failed with "Ansible requires Python 3.9 or newer on the target. Current version: 3.8.10." I had assumed the server was Ubuntu 24.04 based on my Lab 1 notes, but it's actually running Ubuntu 20.04, whose default Python is 3.8. Modern `ansible-core` flatly refuses to run any module against an interpreter that old. Installing `python3.9` via apt and pointing `ansible_python_interpreter` at it fixed the version gate, but then the `apt` module itself broke with a separate error: the `python3-apt` C-extension library that the module depends on internally is only built against the system's default Python (3.8), not the 3.9 I had just installed. I worked around this by having package-related tasks call `apt-get` directly through the `shell` module instead of using Ansible's native `apt` module, with a `changed_when` check on the string `"Setting up"` in the output to preserve idempotency reporting. I also realized this Python bootstrapping was itself a manual step I had done by hand over SSH and hadn't captured in the playbook — which defeats the purpose of "reproducible infrastructure." I fixed that by adding a `pre_tasks` block to `site.yml` that uses Ansible's `raw` module, which executes a command over SSH without needing any Python on the target at all, to install `python3.9` automatically before anything else runs.

**A role-structure mistake with handlers.** I originally wrote my handlers as a `handlers:` key inside each role's `tasks/main.yml` file. Ansible doesn't allow that — a role's task file is just a list of tasks, and handlers must live in a separate `roles/<role>/handlers/main.yml` file. The playbook failed at YAML parsing with a fairly opaque error about "colons in unquoted values" until I split them out correctly.

**Fail2Ban banning my own control machine.** `verify.sh` intentionally tries to SSH in as `root` to confirm root login is blocked — that's a real auth failure, and Fail2Ban counts it. Running the verification script several times in a row while debugging other issues was enough failed-root attempts to trip the ban, and I got locked out of port 22 entirely (visible as "Connection refused," which I initially mistook for a different problem until I recognized the pattern from how Fail2Ban's REJECT action behaves). The fix was adding my control machine's IP to a Fail2Ban `ignoreip` rule deployed by the baseline role, so this can't recur.

**A second, hidden firewall layer.** Even after the playbook ran cleanly and UFW showed port 9100 as allowed, `node_exporter`'s metrics endpoint was unreachable from outside with "No route to host." Checking the raw `iptables -L INPUT` chain on the server showed a catch-all REJECT rule sitting in front of UFW's own chain entirely — a side effect of the manual iptables fix I'd applied back in Lab 1 to get ports 80/443 working, which had created an explicit allow-list that anything new (like port 9100) wasn't part of. I added a matching iptables rule through the baseline role and made it persistent across reboots with `iptables-persistent`, so future port additions to `vars/main.yml` are handled automatically instead of needing another manual SSH fix.

**Handler ordering.** Separately from the bugs above, I had to understand that Ansible handlers only fire at the end of a play after all tasks complete, not immediately when notified. This means if the SSH hardening task changes the config and notifies the SSH restart handler, the restart doesn't happen until every other task finishes. In practice this is fine since Ansible maintains the existing connection for the rest of the play, but it was important to understand before relying on it.

---

## Security Decisions

The baseline role runs first before anything else. This was a deliberate ordering decision — the same logic as Lab 1 where I hardened SSH before deploying services. With Ansible the entire deployment is automated, so there is no opportunity to manually verify security state between steps. Making the baseline role first in `site.yml` means security controls are always applied before any service becomes reachable.

I also created a dedicated system user for node_exporter with no login shell and no home directory. Running the metrics exporter as a system user with minimal privileges means that even if the node_exporter binary had a vulnerability, an attacker exploiting it would land in an account with no shell, no sudo access, and no way to escalate through the normal paths.

The NGINX configuration adds security response headers and disables the server version token. These are small changes individually but together they reduce the information available to an attacker scanning the server.

---

## What I Would Add Next

The verification script currently checks that services are running but doesn't validate configuration correctness. A stronger version would check that SSH password authentication is actually disabled by attempting a password login and confirming it fails, and would verify that the UFW rules match the expected list rather than just checking that UFW is enabled.

The monitoring setup needs a Prometheus server somewhere to actually scrape the node_exporter endpoint. Right now the metrics are available at port 9100 but nothing is collecting or storing them. Adding a cloud-hosted Prometheus instance or deploying Grafana Cloud's free tier to scrape the endpoint would complete the monitoring picture.

Log aggregation is also still local. The rsyslog configuration writes logs to disk on the server itself, which means logs disappear if the instance is terminated. A proper setup would forward logs to a remote syslog server or a log aggregation service so that audit trails survive instance loss.

---

## Operational Risks

The deployment depends on internet access to download the node_exporter binary from GitHub. If GitHub is unavailable or the release URL changes for a new version the monitoring role will fail. A more resilient setup would pre-download the binary and store it in the repository or on an internal artifact server.

The Ansible connection uses the same SSH key as Lab 1. If that key is ever rotated the inventory file needs to be updated to point to the new key. This is manageable for a single server but would need a more formal key management process at scale.

Port 9100 is currently open to the internet via both UFW and the OS-level iptables filter, which means anyone can read the node_exporter metrics. This leaks information about system resource usage, process names, and service states. A production deployment would restrict port 9100 to the Prometheus server's IP only, at both firewall layers.

Finally, this lab reinforced a risk already noted in my Lab 1 reflection: Oracle Cloud's networking stack has more layers than UFW alone, and each new port added to this server needs to be opened in up to three places — UFW, the OS-level iptables filter, and Oracle's own VCN Security List. The Ansible automation now handles the first two automatically, but the Security List still requires a manual change in the Oracle Cloud console, since it sits outside the server entirely and Ansible has no access to it without separate Oracle Cloud API credentials.
