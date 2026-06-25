# dash2 Remote-Control Test Dashboard

A lightweight, **non-Java** test environment for the simulator's remote-control
feature — it replaces the full `rc-dukes/dukes` vert.x stack with a small
Node.js server (per [issue #21](https://github.com/rc-dukes/dash2/issues/21),
ADR: Node.js + `sockjs-node`).

It is both the **vert.x EventBus bridge** (SockJS server the simulator connects
to) and a **control UI** (steering, motor, heartbeat toggle, live image).

## Run

```bash
cd test-dashboard
npm install
npm start            # serves http://localhost:8080  (bridge at /eventbus)
```

Then open the dash simulator (`../index.html`), press the **remote** mode
button — it connects to this server — and open the dashboard at
<http://localhost:8080>.

Environment variables: `PORT` (default 8080), `HEARTBEAT_MS` (default 500).

## Addressing

Addresses match `../js/remote/RemoteConfigEditor.js` defaults (and the
`rc-dukes/dukes` backend). Each endpoint is a **character/responsibility** with a
callsign; the heartbeat and car handlers use the bare callsign, the image is
published to `callsign:SUFFIX`:

| Responsibility | Callsign | EventBus address |
|----------------|----------|------------------|
| watchdog (heartbeat) | Velvet ears | `Velvet ears` |
| car (control) | Lost sheep Bo | `Lost sheep Bo` |
| imageview (debug image) | Red Dog | `Red Dog:SIMULATOR_IMAGE` |

## How it works

- The simulator (browser) is the SockJS **client**; this server is the bridge.
- The dashboard UI talks to this server over a tiny HTTP API
  (`/api/state`, `/api/image`, `/api/heartbeat`, `/api/drive`), which forwards
  `message` frames to the simulator and collects published images.
- Heartbeats drive the image stream (each beat triggers one image reply), so the
  heartbeat toggle exercises the "watchdog optional" part of #16.

See [../docs/test-environment.md](../docs/test-environment.md) for the full guide.
