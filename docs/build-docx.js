const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType
} = require("docx");

const PAGE = {
  size: { width: 12240, height: 15840 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
};

const styles = {
  default: { document: { run: { font: "Calibri", size: 22 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 32, bold: true, font: "Calibri", color: "1F3864" },
      paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 26, bold: true, font: "Calibri", color: "2E5395" },
      paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
  ]
};

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, ...opts })] });
}
function pBold(label, text) {
  return new Paragraph({ spacing: { after: 160 }, children: [
    new TextRun({ text: label, bold: true }),
    new TextRun({ text })
  ] });
}
function code(lines) {
  return new Paragraph({
    spacing: { after: 200 },
    shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" }, right: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" } },
    children: lines.flatMap((line, i) => {
      const run = new TextRun({ text: line || " ", font: "Consolas", size: 19 });
      return i === 0 ? [run] : [new TextRun({ text: "", break: 1 }), run];
    })
  });
}
function bullet(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun(text)],
    bullet: { level: 0 }
  });
}

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    children: headers.map((htext, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: "D9E2F3", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: htext, bold: true })] })]
    }))
  });
  const dataRows = rows.map(r => new TableRow({
    children: r.map((cell, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun(cell)] })]
    }))
  }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [headerRow, ...dataRows] });
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

// ============ DOCUMENT 1: Deployment Documentation ============

const deployChildren = [
  new Paragraph({ children: [new TextRun({ text: "Lab 2 – Deployment Documentation", bold: true, size: 36, color: "1F3864" })], spacing: { after: 80 } }),
  pBold("Student: ", "Althea Barbato"),
  pBold("Date: ", "June 23, 2026"),
  spacer(),

  h1("What this is"),
  p("This is the automation framework I built for Lab 2. Instead of SSHing into webserver01 (same server from Lab 1) and typing commands one at a time, I wrote Ansible playbooks that do the whole setup for me — security baseline, NGINX, logging, and monitoring — and I can rerun the exact same command and get the exact same result every time."),

  h1("How the repo is laid out"),
  code([
    "lab2/",
    "├── ansible/",
    "│   ├── inventory.ini          tells Ansible which server to target",
    "│   ├── site.yml               the main playbook, this is what you actually run",
    "│   ├── vars/main.yml          all the settings in one place (ports, versions, etc)",
    "│   └── roles/",
    "│       ├── baseline/          SSH hardening, UFW, Fail2Ban, patching",
    "│       ├── webserver/         NGINX + my landing page",
    "│       ├── logging/           rsyslog + log rotation",
    "│       └── monitoring/        Prometheus node_exporter",
    "├── scripts/",
    "│   ├── bootstrap.sh           checks everything's ready before you deploy",
    "│   ├── deploy.sh               runs the playbook",
    "│   └── verify.sh               checks everything actually worked after",
    "└── docs/                      this stuff",
  ]),

  h1("What you need before running this"),
  bullet("Linux, macOS, or WSL2 if you're on Windows — Ansible just doesn't run on Windows directly, I learned that the hard way"),
  bullet("Ansible installed (I'm on ansible-core 2.20, anything 2.14+ should be fine)"),
  bullet("The same SSH key from Lab 1 (~/.ssh/lab1-key.pem)"),
  bullet("The server itself — webserver01, IP 163.192.117.50, and it's actually Ubuntu 20.04, not 24.04 like I had originally written down in my Lab 1 notes"),
  spacer(),
  p("One thing that tripped me up for a while: newer versions of Ansible just refuse to talk to a server running Python older than 3.9, and Ubuntu 20.04 ships with Python 3.8 by default. I ended up adding a step at the very top of site.yml that installs Python 3.9 automatically the first time it runs, using Ansible's raw module since that one doesn't need Python on the other end at all. So you shouldn't have to think about this anymore, but I'm leaving the explanation here because it took me forever to figure out what was actually going on."),

  h1("How to actually run it"),
  pBold("1. cd into the folder", ""),
  code(["cd lab2"]),
  pBold("2. Run bootstrap first", " — this just makes sure Ansible's installed, your key works, and the server is reachable"),
  code(["bash scripts/bootstrap.sh"]),
  p("You want to see \"ping\": \"pong\" at the end."),
  pBold("3. (optional) dry run", " — shows you what would change without touching anything"),
  code(["bash scripts/deploy.sh --check"]),
  pBold("4. Actually deploy", ""),
  code(["bash scripts/deploy.sh"]),
  p("This connects over SSH and runs through four roles in order: baseline (security stuff first, always), then webserver, then logging, then monitoring."),
  pBold("5. Verify", " — the deploy script runs this automatically at the end anyway, but you can run it by itself too"),
  code(["bash scripts/verify.sh"]),
  p("When everything's working it looks like this:"),
  code([
    "======================================",
    " Results: 10 passed, 0 failed",
    "======================================",
  ]),

  h1("Problems I actually ran into (not hypothetical ones)"),
  pBold("Oracle has a second firewall you don't see. ", "I found this out the hard way — UFW said port 9100 was allowed, but I still couldn't reach the metrics endpoint from outside. Turns out there's an iptables rule sitting in front of UFW's own rules on this image (leftover from a fix I had to do manually back in Lab 1 to get ports 80/443 working) that just rejects anything not on its own little list. UFW has no idea this is happening — it'll happily tell you a port is open while this other layer silently drops the traffic before UFW ever sees it. I added a task to the baseline role that inserts a matching rule into that chain for every port, and made it stick across reboots with iptables-persistent."),
  pBold("I locked myself out with my own verification script. ", "verify.sh tries to SSH in as root on purpose, to prove root login is actually blocked. Thing is, that's a real failed login attempt as far as Fail2Ban is concerned, and running the script a few times in a row while I was debugging something else was enough to get my own IP banned. Took me a minute to realize \"Connection refused\" meant I'd banned myself and not that something else had broken. Fixed it by adding my IP to a Fail2Ban exemption list that the baseline role now sets up automatically."),

  h1("Settings you can change"),
  p("Everything configurable lives in ansible/vars/main.yml — server hostname, the IP, which ports get opened, what version of node_exporter to install, how long logs stick around, and my own IP for the Fail2Ban exemption. Change something there and rerun deploy.sh, no need to dig through the actual role files."),

  h1("If I want to change something later"),
  p("Want to change the landing page? Just edit ansible/roles/webserver/templates/index.html.j2 and redeploy — Ansible notices the file changed and pushes it. Want to open a new port? Add it to the allowed_ports list in vars and redeploy, it won't mess with the ports that are already open."),

  h1("What's actually running on the server now"),
  table(
    ["Service", "Port", "Why it's there"],
    [
      ["OpenSSH", "22", "how I get in, and how Ansible connects"],
      ["NGINX", "80", "serves the landing page"],
      ["UFW", "—", "firewall, default deny"],
      ["Fail2Ban", "—", "bans IPs that fail login too many times"],
      ["unattended-upgrades", "—", "installs security patches automatically"],
      ["rsyslog", "—", "collects logs"],
      ["node_exporter", "9100", "exposes system metrics for monitoring"],
      ["iptables-persistent", "—", "keeps OS-level firewall rules from disappearing on reboot"],
    ],
    [2600, 1200, 5560]
  ),
];

// ============ DOCUMENT 2: Architecture Overview ============

const archChildren = [
  new Paragraph({ children: [new TextRun({ text: "Lab 2 – Architecture Overview", bold: true, size: 36, color: "1F3864" })], spacing: { after: 80 } }),
  pBold("Student: ", "Althea Barbato"),
  pBold("Date: ", "June 23, 2026"),
  spacer(),

  h1("How it all fits together"),
  code([
    "MY LAPTOP (control machine, via WSL)",
    "  lab2/ansible/site.yml      ← the playbook I actually run",
    "  lab2/ansible/roles/        ← baseline, webserver, logging, monitoring",
    "  lab2/scripts/deploy.sh     ← wraps ansible-playbook + runs verification",
    "",
    "          | SSH (key-only, port 22)",
    "          v",
    "",
    "webserver01 — Oracle Cloud, Ubuntu Server 20.04 LTS, 163.192.117.50",
    "",
    "  UFW firewall   |  NGINX :80      |  node_exporter :9100",
    "  SSH key-only   |  Fail2Ban       |  rsyslog + logrotate",
    "",
    "  logs in: /var/log/nginx/, /var/log/auth.log, /var/log/syslog",
  ]),

  h1("What each role actually does"),
  bullet("baseline — runs first, every time. Updates packages, locks down SSH, sets up UFW, fixes a hidden iptables issue (more on that below), gets Fail2Ban running, turns on auto security updates."),
  bullet("webserver — installs NGINX and pushes out my landing page from a template."),
  bullet("logging — sets up rsyslog so logs are actually structured, and configures rotation so they don't pile up forever (30 days, then they get compressed and eventually deleted)."),
  bullet("monitoring — installs Prometheus node_exporter, which exposes a bunch of system metrics (CPU, memory, disk, etc.) on port 9100 so something like Prometheus or Grafana could scrape it later."),
  spacer(),
  p("I made baseline run first on purpose — same reasoning as Lab 1, where I hardened SSH before turning anything else on. With Ansible doing everything in one shot there's no manual step in between to double check security is in place, so it has to be first in the playbook itself."),
  p("There's also a step before any of the roles run that installs Python 3.9 on the server if it's not already there — using Ansible's raw module, which is basically just running a plain SSH command, no Python required. I needed this because the server's default Python (3.8) is too old for the version of Ansible I'm using, and I didn't want that to be a manual step I had to remember to do by hand."),

  h1("Security stuff I built in"),
  bullet("SSH is key-only, no root login, no passwords — handled through a config file dropped into sshd_config.d"),
  bullet("UFW defaults to deny everything incoming, only opens the ports that are actually needed (22, 80, 443, 9100)"),
  bullet("Fail2Ban watches for failed SSH logins and bans IPs automatically"),
  bullet("Automatic security patching through unattended-upgrades"),
  bullet("node_exporter runs as its own system user with no shell and no home directory — if there's ever a vulnerability in it, there's nowhere for an attacker to go from there"),
  bullet("NGINX has security headers turned on and hides its version number in responses"),
  bullet("There's also a second iptables-level firewall rule set that mirrors the UFW rules (explained below) and a Fail2Ban exemption list so I don't accidentally lock myself out while testing"),

  h1("Two things that bit me that I want to explain here too"),
  pBold("The iptables thing. ", "This server has an extra firewall layer underneath UFW that I didn't know about until I hit it. It's a leftover from Lab 1 — I had to manually add iptables rules back then to get ports 80 and 443 working because Oracle's base image apparently ships with a default-reject rule sitting in front of UFW's own chain. The problem is that rule only knew about 80, 443, and 22. When I opened port 9100 through UFW for node_exporter, UFW said it was fine, but the metrics endpoint still wasn't reachable from outside — that other layer was silently rejecting it first. I added a step to the baseline role that keeps this in sync automatically now, so any port I add to my settings file gets opened at both layers, and made it persist across reboots."),
  pBold("The idempotency thing with packages. ", "I originally used Ansible's built-in apt module to install packages, which is supposed to be the \"proper\" idempotent way to do it. Except it broke — turns out that module needs a library called python3-apt that's only built for the system's default Python (3.8), not the 3.9 I had to install. So instead, those tasks just call apt-get directly through a shell command, and I check the output for the words \"Setting up\" to figure out whether anything actually changed, so it still reports correctly when nothing needed to be installed."),
  spacer(),
  p("Other than that, the idempotency is pretty standard Ansible stuff — files only get rewritten if their contents actually changed, the node_exporter binary only gets downloaded if it's not already there, and the iptables/UFW rules check if they already exist before adding themselves again."),
];

async function build(children, filename) {
  const doc = new Document({
    styles,
    sections: [{ properties: { page: PAGE }, children }]
  });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(__dirname, filename), buffer);
  console.log("wrote", filename);
}

build(deployChildren, "deployment-documentation.docx");
build(archChildren, "architecture-overview.docx");
