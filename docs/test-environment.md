# Test Environment — Remote Control without the Java stack

This describes how to set up a **lightweight test environment** for the
simulator's [remote-control feature](./remote-control.md) **without** standing up
the full Java/vert.x [`rc-dukes/dukes`](https://github.com/rc-dukes/dukes)
backend.

It is the setup for the test dashboard tracked in
[issue #21](https://github.com/rc-dukes/dash2/issues/21). Per the accepted ADR
there, the dashboard is implemented in **Node.js + `sockjs-node`** (stack match
with the JS frontend, team familiarity).

## Background / references

The browser (`js/remote/SimulatorVerticle.js`) is the **SockJS client** — it
connects out to `http://localhost:8080/eventbus`. The Java backend only provides
the **vert.x EventBus bridge** (a SockJS server). So the test environment just
needs a small Node.js server that speaks that bridge protocol.

Authoritative documentation:

- [docs/remote-control.md](./remote-control.md) — protocol, message schema, connection states
- [Rc-dukes](https://wiki.bitplan.com/index.php/Rc-dukes) — `module → character → callsign` mapping and the vert.x **Messages** graph
- [Self Driving RC Car](https://wiki.bitplan.com/index.php/Self_Driving_RC_Car) / [Systemcontext](https://wiki.bitplan.com/index.php/Self_Driving_RC_Car/Systemcontext) — architecture
- [Vert.x](https://wiki.bitplan.com/index.php/Vert.x) — EventBus / SockJS bridge background

### Addressing: callsign + responsibility (never bare callsign)

EventBus addresses follow the documented `callsign:EVENT` convention (e.g.
`Red Dog:SIMULATOR_IMAGE`). Addressing by bare callsign is a pre-2019 flaw that
was already fixed — use callsign + responsibility.

| Responsibility (module) | Character | Callsign | Direction | Dashboard role |
|--------------------------|-----------|----------|-----------|----------------|
| watchdog (heartbeat) | FLASH | `Velvet ears` | server → sim | send periodic heartbeats (also drives image replies) |
| car (control inputs) | BO | `Lost sheep Bo` | server → sim | send `servodirect` / `servo` / `motor` commands |
| imageview (debug images) | ROSCO | `Red Dog` | sim → server | receive JPEG data-URLs, display them |

## Prerequisites

- **Node.js** ≥ 18 (`node --version`)
- The dash simulator built and runnable (see the project [README](../README.md)):

  ```bash
  ./install   # one-time: installs dependencies
  ./run       # builds dist/ and is ready to serve
  ```

## 1. Run the simulator

Open `index.html` in a WebGL2-capable browser (Chrome recommended). It loads the
`dist/` bundles and the SockJS + vert.x EventBus client libraries. Leave it open;
the **remote** mode button is what triggers the outbound connection.

## 2. Set up the Node.js test dashboard

The dashboard is both the **EventBus bridge** (SockJS server on port 8080) and a
small control UI. Scaffold:

```bash
mkdir -p test-dashboard && cd test-dashboard
npm init -y
npm install sockjs
```

Minimal bridge (`server.js`) — see issue #21 for the fuller sketch:

```js
const http = require('http'), sockjs = require('sockjs');
const ebus = sockjs.createServer({ prefix: '/eventbus' });
let conn = null, hb = 0, beat = null, lastImage = null;

ebus.on('connection', c => {
  conn = c;
  c.on('data', m => {                       // frames FROM the simulator
    const f = JSON.parse(m);
    if (f.type === 'publish' && f.address === 'Red Dog:SIMULATOR_IMAGE')
      lastImage = f.body;                    // data:image/jpeg URL
    // 'register' / 'unregister' / 'ping' -> track/ignore
  });
  c.on('close', () => { conn = null; });
});

function sendToSim(address, body) {          // frames TO the simulator
  if (conn) conn.write(JSON.stringify({ type: 'message', address, body }));
}
// heartbeat toggle (watchdog) — also drives the image stream:
const startBeat = () => beat = setInterval(() => sendToSim('Velvet ears', { n: ++hb }), 500);
const stopBeat  = () => { clearInterval(beat); beat = null; };
// drive: sendToSim('Lost sheep Bo', { type: 'servodirect', position: 30 })

const srv = http.createServer();
ebus.installHandlers(srv, { prefix: '/eventbus' });
srv.listen(8080, '0.0.0.0', () => console.log('test bridge on :8080/eventbus'));
```

Run it:

```bash
node server.js
```

> The simulator's EventBus URL is currently hardcoded to
> `http://localhost:8080/eventbus`, so binding the test server there means **no
> change to the simulator** is needed. (Making the URL/callsigns configurable is
> [#16](https://github.com/rc-dukes/dash2/issues/16).)

## 3. Connect and verify

1. In the simulator UI, click the **remote** mode button.
2. Watch the remote-mode button color (see [remote-control.md](./remote-control.md#connection-state)):
   - **violet** — no EventBus yet
   - **orange** — connecting
   - **green** — connected ✅
   - **red** — closed (test server not reachable)
3. With the **heartbeat** running, the simulator replies with a JPEG to
   `Red Dog:SIMULATOR_IMAGE` on each beat — the dashboard's `lastImage` updates.
4. Sending `servodirect` / `servo` / `motor` to `Lost sheep Bo` steers/throttles
   the simulated car.

## Troubleshooting

- **Button stays red/violet** — the test server isn't listening on
  `:8080/eventbus`, or the SockJS path/prefix doesn't match. Confirm `node server.js`
  is running and reachable.
- **No images** — images are heartbeat-driven; make sure heartbeats are being
  sent to `Velvet ears`.
- **Steering doesn't read back** — known bugs to pick up in #21:
  `RemoteControl` ignores its constructor args, and `motor brake`/`stop` write to
  `this.break` (typo) instead of `this.brake`.

## Related

- [issue #21](https://github.com/rc-dukes/dash2/issues/21) — the test dashboard (Node.js, ADR Accepted)
- [issue #16](https://github.com/rc-dukes/dash2/issues/16) — make remote-control URL/callsigns configurable, watchdog optional
- [docs/remote-control.md](./remote-control.md) — the protocol this test env exercises
