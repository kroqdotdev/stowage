#!/usr/bin/env node
/*
  Stowage updater sidecar.

  Runs next to the app in the release compose project with the Docker socket
  mounted. The app asks it (over the compose network, with a shared token) to
  move the project to a published release:

    GET  /status          current state and the tail of the last run's log
    POST /update {version} start an update to that version

  The update itself runs in a short-lived helper container started from this
  same image. The helper mounts the compose project directory at its own host
  path, so relative volume paths in the compose file (./pb_data) resolve the
  way they do on the host, and it survives this container being recreated.
  Status and log live in the /state volume, which both containers share, so
  the new updater instance reports the run that replaced it.

  The helper:
    1. docker compose pull <project services>
    2. pins STOWAGE_VERSION=<version> in the project's env file(s)
    3. docker compose up -d --no-deps <project services except updater>
    4. docker compose up -d --no-deps updater (recreates this container)
*/
import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const SOCKET = process.env.DOCKER_HOST_SOCKET ?? "/var/run/docker.sock";
const STATE_DIR = process.env.STOWAGE_UPDATER_STATE_DIR ?? "/state";
const STATE_FILE = path.join(STATE_DIR, "status.json");
const PORT = Number(process.env.STOWAGE_UPDATER_PORT ?? 9876);
const TOKEN = (process.env.STOWAGE_UPDATER_TOKEN ?? "").trim();
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const LOG_LINES = 200;
// A run that has not reported in this long is force-stopped and failed.
const RUN_TIMEOUT_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Docker Engine API over the unix socket (no dependencies).
// ---------------------------------------------------------------------------

function docker(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: SOCKET,
        method,
        path: apiPath,
        headers: body ? { "content-type": "application/json" } : undefined,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          if (status >= 400) {
            reject(
              new Error(
                `Docker API ${method} ${apiPath} failed (${status}): ${json?.message ?? text}`,
              ),
            );
            return;
          }
          resolve(json);
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function inspectSelf() {
  const id = os.hostname();
  return docker("GET", `/containers/${encodeURIComponent(id)}/json`);
}

function composeLabels(info) {
  const labels = info?.Config?.Labels ?? {};
  const project = labels["com.docker.compose.project"];
  const workingDir = labels["com.docker.compose.project.working_dir"];
  const configFiles = labels["com.docker.compose.project.config_files"];
  const envFiles = labels["com.docker.compose.project.environment_file"];
  const service = labels["com.docker.compose.service"];
  if (!project || !workingDir || !configFiles) {
    throw new Error(
      "The updater must run as a service of the Stowage compose project (compose labels missing).",
    );
  }
  return {
    project,
    workingDir,
    configFiles: configFiles.split(",").filter(Boolean),
    envFiles: (envFiles ?? "").split(",").filter(Boolean),
    service: service ?? "updater",
  };
}

// Every service of the project with a container, whatever its state: a
// service that is restarting at that moment must move with the others.
async function projectServices(project) {
  const filters = encodeURIComponent(
    JSON.stringify({ label: [`com.docker.compose.project=${project}`] }),
  );
  const containers = await docker(
    "GET",
    `/containers/json?all=true&filters=${filters}`,
  );
  const services = new Set();
  for (const container of containers) {
    const service = container.Labels?.["com.docker.compose.service"];
    if (service) services.add(service);
  }
  return [...services].sort();
}

// ---------------------------------------------------------------------------
// State file shared with the helper through the /state volume.
// ---------------------------------------------------------------------------

const IDLE = {
  state: "idle",
  targetVersion: null,
  startedAt: null,
  finishedAt: null,
  log: [],
  error: null,
  runId: null,
};

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...IDLE,
      ...parsed,
      log: Array.isArray(parsed.log) ? parsed.log : [],
    };
  } catch {
    return { ...IDLE };
  }
}

async function writeState(state) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state), "utf8");
  await fs.rename(tmp, STATE_FILE);
}

// ---------------------------------------------------------------------------
// serve: the HTTP API the app talks to.
// ---------------------------------------------------------------------------

function authorized(req) {
  const header = req.headers.authorization ?? "";
  const expected = Buffer.from(`Bearer ${TOKEN}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 4096) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

let starting = false;

async function startUpdate(version) {
  const self = await inspectSelf();
  const labels = composeLabels(self);
  const services = await projectServices(labels.project);
  if (!services.length) {
    throw new Error(
      `No services found for compose project "${labels.project}".`,
    );
  }
  const stateMount = (self.Mounts ?? []).find(
    (m) => m.Destination === STATE_DIR,
  );
  if (!stateMount) {
    throw new Error(`The updater has no volume mounted at ${STATE_DIR}.`);
  }
  const stateSource =
    stateMount.Type === "volume" ? stateMount.Name : stateMount.Source;
  const socketMount = (self.Mounts ?? []).find((m) => m.Destination === SOCKET);
  const socketSource = socketMount?.Source ?? SOCKET;

  await cleanupHelper(await readState());

  const name = `${labels.project}-updater-run-${Date.now()}`;
  const created = await docker(
    "POST",
    `/containers/create?name=${encodeURIComponent(name)}`,
    {
      Image: self.Config.Image,
      Cmd: [
        "node",
        "/updater/server.mjs",
        "apply",
        "--version",
        version,
        "--project",
        labels.project,
        "--working-dir",
        labels.workingDir,
        "--config-files",
        labels.configFiles.join(","),
        "--env-files",
        (labels.envFiles.length
          ? labels.envFiles
          : [path.join(labels.workingDir, ".env")]
        ).join(","),
        "--services",
        services.join(","),
        "--self",
        labels.service,
      ],
      Env: [
        `STOWAGE_UPDATER_STATE_DIR=${STATE_DIR}`,
        `COMPOSE_PROFILES=${process.env.COMPOSE_PROFILES ?? ""}`,
      ],
      WorkingDir: labels.workingDir,
      Labels: { "dev.stowage.updater.run": "true" },
      // The image's healthcheck probes the HTTP server, which the helper does
      // not run.
      Healthcheck: { Test: ["NONE"] },
      HostConfig: {
        Mounts: [
          { Type: "bind", Source: socketSource, Target: SOCKET },
          {
            Type: stateMount.Type === "volume" ? "volume" : "bind",
            Source: stateSource,
            Target: STATE_DIR,
          },
          ...hostDirs(labels).map((dir) => ({
            Type: "bind",
            Source: dir,
            Target: dir,
          })),
        ],
      },
    },
  );
  await writeState({
    state: "running",
    targetVersion: version,
    startedAt: Date.now(),
    finishedAt: null,
    log: [`Starting update to ${version} for project ${labels.project}`],
    error: null,
    runId: created.Id,
  });
  await docker("POST", `/containers/${created.Id}/start`);
  return { id: created.Id, services };
}

// The project directory, plus the directories of compose and env files that
// live outside it (`-f ../stack.yml`), each at its own host path so compose
// resolves relative paths exactly as it does on the host.
function hostDirs(labels) {
  const dirs = new Set([labels.workingDir]);
  for (const file of [...labels.configFiles, ...labels.envFiles]) {
    const dir = path.dirname(file);
    const inside = [...dirs].some(
      (known) => dir === known || dir.startsWith(`${known}${path.sep}`),
    );
    if (!inside) dirs.add(dir);
  }
  return [...dirs];
}

async function helperLogs(id) {
  return new Promise((resolve) => {
    const chunks = [];
    const req = http.request(
      {
        socketPath: SOCKET,
        method: "GET",
        path: `/containers/${id}/logs?stdout=1&stderr=1&tail=40`,
      },
      (res) => {
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          // Demultiplex the 8-byte frame headers Docker adds without a TTY.
          let buffer = Buffer.concat(chunks);
          let text = "";
          while (buffer.length >= 8) {
            const size = buffer.readUInt32BE(4);
            text += buffer.subarray(8, 8 + size).toString("utf8");
            buffer = buffer.subarray(8 + size);
          }
          resolve(text.split("\n").filter(Boolean));
        });
        res.on("error", () => resolve([]));
      },
    );
    req.on("error", () => resolve([]));
    req.end();
  });
}

// A "running" state whose helper is gone means the helper crashed before it
// could report; a finished helper is removed once it has exited.
async function reconcile(state) {
  if (!state.runId) return state;
  let info = null;
  try {
    info = await docker("GET", `/containers/${state.runId}/json`);
  } catch {
    info = null;
  }
  if (state.state === "running") {
    const alive = Boolean(info && info.State?.Running);
    const timedOut =
      Date.now() - (state.startedAt ?? Date.now()) > RUN_TIMEOUT_MS;
    if (alive && !timedOut) return state;
    const logs = info ? await helperLogs(state.runId) : [];
    const next = {
      ...state,
      state: "failed",
      finishedAt: Date.now(),
      error: timedOut
        ? "The update did not finish within 30 minutes and was stopped. Check the services with `docker compose ps` on the host."
        : "The update helper stopped before finishing. Check the services with `docker compose ps` on the host.",
      log: [...state.log, ...logs.map((line) => `helper: ${line}`)].slice(
        -LOG_LINES,
      ),
    };
    await writeState(next);
    await cleanupHelper(next);
    return next;
  }
  if (info && !info.State?.Running) await cleanupHelper(state);
  return state;
}

async function cleanupHelper(state) {
  if (!state.runId) return;
  try {
    await docker("DELETE", `/containers/${state.runId}?force=true`);
  } catch {
    // already gone
  }
}

function serve() {
  if (!TOKEN) {
    console.error(
      "STOWAGE_UPDATER_TOKEN is not set. Refusing to start the updater.",
    );
    process.exit(1);
  }
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://updater");
      if (url.pathname === "/health") {
        send(res, 200, { status: "ok" });
        return;
      }
      if (!authorized(req)) {
        send(res, 401, { error: "Unauthorized" });
        return;
      }
      if (req.method === "GET" && url.pathname === "/status") {
        const state = await reconcile(await readState());
        send(res, 200, {
          ...state,
          runId: undefined,
          log: state.log.slice(-LOG_LINES),
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/update") {
        let body;
        try {
          body = JSON.parse((await readBody(req)) || "{}");
        } catch {
          send(res, 400, { error: "Invalid JSON body" });
          return;
        }
        const version = String(body?.version ?? "").trim();
        if (!VERSION_RE.test(version)) {
          send(res, 400, { error: "Invalid version" });
          return;
        }
        const current = await reconcile(await readState());
        if (starting || current.state === "running") {
          send(res, 409, { error: "An update is already running" });
          return;
        }
        starting = true;
        try {
          const run = await startUpdate(version);
          send(res, 202, {
            ...(await readState()),
            run: run.id,
            services: run.services,
          });
        } finally {
          starting = false;
        }
        return;
      }
      send(res, 404, { error: "Not found" });
    } catch (error) {
      console.error(error);
      // Details go to the container log, not to the caller.
      send(res, 500, {
        error: "The updater could not start the update. See its container log.",
      });
    }
  });
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Stowage updater listening on :${PORT}`);
  });
}

// ---------------------------------------------------------------------------
// apply: runs inside the helper container.
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      out[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

// Appends are serialised: compose prints several lines at once and two
// concurrent tmp-file writes of the state would race each other.
let logChain = Promise.resolve();
function appendLog(state, line) {
  logChain = logChain
    .then(async () => {
      const stamp = new Date().toISOString().slice(11, 19);
      state.log.push(`${stamp} ${line}`);
      if (state.log.length > LOG_LINES)
        state.log.splice(0, state.log.length - LOG_LINES);
      process.stdout.write(`${line}\n`);
      await writeState(state);
    })
    .catch((error) => {
      console.error("state write failed", error);
    });
  return logChain;
}

function runCommand(state, cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env } });
    const onData = (chunk) => {
      for (const line of chunk.toString("utf8").split("\n")) {
        if (line.trim()) appendLog(state, line.trimEnd());
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        // "docker compose pull" rather than the whole argv with host paths.
        const verb =
          args.find(
            (arg, i) =>
              i > 0 &&
              !args[i - 1].startsWith("--") &&
              !arg.startsWith("--") &&
              arg !== "compose",
          ) ?? "";
        reject(
          new Error(
            `${cmd} compose ${verb} exited with ${code}`.replace(/\s+/g, " "),
          ),
        );
      }
    });
  });
}

async function pinVersion(envFile, version) {
  let content = "";
  try {
    content = await fs.readFile(envFile, "utf8");
  } catch {
    content = "";
  }
  const line = `STOWAGE_VERSION=${version}`;
  const lines = content.split("\n");
  let replaced = false;
  const next = lines.map((entry) => {
    if (/^\s*(export\s+)?STOWAGE_VERSION\s*=/.test(entry)) {
      replaced = true;
      return line;
    }
    return entry;
  });
  if (!replaced) {
    if (next.length && next[next.length - 1] !== "") next.push("");
    next.push(line, "");
  }
  await fs.writeFile(envFile, next.join("\n"), "utf8");
}

async function apply(args) {
  const version = args.version;
  if (!VERSION_RE.test(version ?? "")) throw new Error("Invalid version");
  const services = (args.services ?? "").split(",").filter(Boolean);
  const self = args.self ?? "updater";
  const others = services.filter((s) => s !== self);
  const envFiles = (args["env-files"] ?? "").split(",").filter(Boolean);
  const compose = [
    "compose",
    "--project-name",
    args.project,
    "--project-directory",
    args["working-dir"],
    ...(args["config-files"] ?? "")
      .split(",")
      .filter(Boolean)
      .flatMap((f) => ["--file", f]),
    // The same env files the operator started the stack with, so secrets
    // interpolate the same way. Variables exported only in their shell are
    // not available here; .env is the place for them.
    ...envFiles.flatMap((f) => ["--env-file", f]),
  ];
  const env = {
    STOWAGE_VERSION: version,
    COMPOSE_PROFILES: process.env.COMPOSE_PROFILES ?? "",
  };

  const state = await readState();
  state.state = "running";
  state.targetVersion = version;
  state.error = null;
  try {
    // Pull first: a bad tag or an unreachable registry leaves both the
    // containers and the .env pin exactly as they were.
    await appendLog(state, `Pulling images for: ${services.join(", ")}`);
    await runCommand(state, "docker", [...compose, "pull", ...services], env);

    for (const file of envFiles) {
      await appendLog(state, `Pinning STOWAGE_VERSION=${version} in ${file}`);
      await pinVersion(file, version);
    }

    if (others.length) {
      await appendLog(state, `Recreating: ${others.join(", ")}`);
      await runCommand(
        state,
        "docker",
        [...compose, "up", "-d", "--no-deps", ...others],
        env,
      );
    }

    state.state = "succeeded";
    state.finishedAt = Date.now();
    await appendLog(state, `Stowage is now on ${version}.`);

    if (services.includes(self)) {
      // The app is already updated; a problem here is only the updater's.
      try {
        await appendLog(state, `Recreating the updater (${self}) last.`);
        await runCommand(
          state,
          "docker",
          [...compose, "up", "-d", "--no-deps", self],
          env,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await appendLog(
          state,
          `The updater itself could not be recreated (${reason}). Stowage is on ${version}; run \`docker compose up -d ${self}\` on the host.`,
        );
      }
    }
  } catch (error) {
    state.state = "failed";
    state.finishedAt = Date.now();
    state.error = error instanceof Error ? error.message : String(error);
    await appendLog(state, `Update failed: ${state.error}`);
    process.exitCode = 1;
  }
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === "apply") {
  apply(parseArgs(rest)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  serve();
}
