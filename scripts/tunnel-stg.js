// scripts/tunnel-stg.js
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

// .env.localを読み込む
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const keyPath =
  process.env.SSH_KEY_PATH ||
  path.join(os.homedir(), ".ssh", "dandoli_bastion"); // 必要なら変える
const sshHost = process.env.SSH_HOST || "52.196.65.142";
const sshUser = process.env.SSH_USER || "dandolijp";
const localPort = process.env.DB_LOCAL_PORT || "13306";
const remoteHost = process.env.DB_REMOTE_HOST || "stg-work-db.dandoli.jp";
const remotePort = process.env.DB_REMOTE_PORT || "3306";

const args = [
  "-i",
  keyPath,
  "-o",
  "ExitOnForwardFailure=yes",
  "-o",
  "StrictHostKeyChecking=no",
  "-o",
  "PubkeyAcceptedAlgorithms=+ssh-rsa",
  "-o",
  "HostkeyAlgorithms=+ssh-rsa",
  "-N",
  "-L",
  `${localPort}:${remoteHost}:${remotePort}`,
  `${sshUser}@${sshHost}`,
];

console.log("[tunnel] ssh " + args.join(" "));

const proc = spawn("ssh", args, { stdio: "inherit" });

proc.on("exit", (code) => {
  console.log("[tunnel] exited:", code);
  process.exit(code ?? 0);
});
