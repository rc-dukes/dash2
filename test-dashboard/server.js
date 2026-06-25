#!/usr/bin/env node
// Lightweight, non-Java test dashboard for the dash2 remote-control feature.
//
// The dash simulator (browser) is the SockJS *client*: it connects out to
// http://localhost:8080/eventbus and registers handlers. This server is the
// vert.x EventBus *bridge* (SockJS server) that the real rc-dukes/dukes Java
// backend would otherwise provide, plus a small control UI.
//
// rc-dukes addressing convention: addresses are "callsign:SUFFIX", never a bare
// callsign. Keep these in sync with js/remote/RemoteConfigEditor.js defaults.
//
// See ../docs/test-environment.md and https://github.com/rc-dukes/dash2/issues/21

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const sockjs = require("sockjs");

const PORT = Number(process.env.PORT) || 8080;
const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS) || 500;

// callsign + responsibility (must match the simulator's RemoteConfigEditor defaults)
const ADDR = {
  heartbeat: "Velvet ears:HEARTBEAT",
  car: "Lost sheep Bo:CARCOMMAND",
  image: "Red Dog:SIMULATOR_IMAGE",
};

// ---- state -----------------------------------------------------------------
let conn = null;            // the connected simulator (single client is enough)
let heartbeatCount = 0;
let heartbeatTimer = null;
let lastImage = null;       // most recent data:image/... URL from the simulator
let lastImageAt = 0;

// ---- EventBus bridge -------------------------------------------------------
const ebus = sockjs.createServer({ prefix: "/eventbus", log: () => {} });

ebus.on("connection", (c) => {
  conn = c;
  log(`simulator connected (${c.id})`);
  c.on("data", (raw) => {
    let frame;
    try { frame = JSON.parse(raw); } catch { return; }
    // Frames from the simulator: register / unregister / publish / ping
    if (frame.type === "publish" && frame.address === ADDR.image) {
      lastImage = frame.body;
      lastImageAt = Date.now();
    }
    // register/unregister/ping need no action for this single-client bridge
  });
  c.on("close", () => {
    if (conn === c) conn = null;
    log("simulator disconnected");
  });
});

// deliver a message TO the simulator (it dispatches on the address)
function sendToSim(address, body) {
  if (!conn) return false;
  conn.write(JSON.stringify({ type: "message", address, body }));
  return true;
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    sendToSim(ADDR.heartbeat, { count: ++heartbeatCount, ts: Date.now() });
  }, HEARTBEAT_MS);
  log(`heartbeat started (${HEARTBEAT_MS}ms)`);
}
function stopHeartbeat() {
  if (!heartbeatTimer) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  log("heartbeat stopped");
}

// ---- dashboard HTTP API + static UI ----------------------------------------
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}

const srv = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  if (p === "/" || p === "/index.html") {
    const file = path.join(__dirname, "public", "index.html");
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(500); res.end("dashboard UI missing"); return; }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buf);
    });
    return;
  }

  if (p === "/api/state") {
    return sendJson(res, 200, {
      connected: !!conn,
      heartbeat: !!heartbeatTimer,
      heartbeatCount,
      hasImage: !!lastImage,
      imageAgeMs: lastImage ? Date.now() - lastImageAt : null,
      addresses: ADDR,
    });
  }

  if (p === "/api/image") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end(lastImage || "");
    return;
  }

  if (p === "/api/heartbeat" && req.method === "POST") {
    const { on } = await readBody(req);
    on ? startHeartbeat() : stopHeartbeat();
    return sendJson(res, 200, { heartbeat: !!heartbeatTimer });
  }

  if (p === "/api/drive" && req.method === "POST") {
    const body = await readBody(req); // e.g. {type:'servodirect',position:30} | {type:'servo',position:'left'} | {type:'motor',speed:'up'}
    const ok = sendToSim(ADDR.car, body);
    return sendJson(res, ok ? 200 : 409, { sent: ok, body });
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

ebus.installHandlers(srv, { prefix: "/eventbus" });

srv.listen(PORT, "0.0.0.0", () => {
  log(`test dashboard on http://localhost:${PORT}  (EventBus bridge at /eventbus)`);
  log(`addresses: ${JSON.stringify(ADDR)}`);
});

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[test-dashboard] ${msg}`);
}
