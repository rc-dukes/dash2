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

### Addressing (callsign + responsibility)

Each endpoint is identified by its **character/responsibility** and a **callsign**
(see [Rc-dukes](https://wiki.bitplan.com/index.php/Rc-dukes)). The actual EventBus
addresses, matching `js/remote/RemoteConfigEditor.js` and the `rc-dukes/dukes`
backend, are: the **bare callsign** for the heartbeat and car handlers, and
`callsign:SUFFIX` for the image (`Red Dog:SIMULATOR_IMAGE`).

| Responsibility (module) | Character | Callsign | EventBus address | Direction | Dashboard role |
|--------------------------|-----------|----------|------------------|-----------|----------------|
| watchdog (heartbeat) | FLASH | Velvet ears | `Velvet ears` | server → sim | send periodic heartbeats (also drives image replies) |
| car (control inputs) | BO | Lost sheep Bo | `Lost sheep Bo` | server → sim | send `servodirect` / `servo` / `motor` commands |
| imageview (debug images) | ROSCO | Red Dog | `Red Dog:SIMULATOR_IMAGE` | sim → server | receive JPEG data-URLs, display them |

These match the defaults in `js/remote/RemoteConfigEditor.js` (and the
`rc-dukes/dukes` backend); change both sides together if you customize them.

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

## 2. Run the Node.js test dashboard

The dashboard is committed in [`test-dashboard/`](../test-dashboard/) — it is both
the **EventBus bridge** (SockJS server on port 8080) and a **control UI**
(steering slider, motor buttons, heartbeat toggle, live image). No scaffolding
needed:

```bash
cd test-dashboard
npm install
npm start            # serves http://localhost:8080  (bridge at /eventbus)
```

Environment variables: `PORT` (default 8080), `HEARTBEAT_MS` (default 500).
See [test-dashboard/README.md](../test-dashboard/README.md) for details.

> The simulator's default EventBus URL is `http://localhost:8080/eventbus`, so
> binding the test server there means **no change to the simulator** is needed.
> The URL and callsign/responsibility addresses are configurable in the
> simulator's remote config (delivered in [#16](https://github.com/rc-dukes/dash2/issues/16));
> if you change them, change `test-dashboard/server.js` to match.

## 3. Connect and verify

1. In the simulator UI, click the **remote** mode button.
2. Watch the remote-mode button color (see [remote-control.md](./remote-control.md#connection-state)):
   - **violet** — no EventBus yet
   - **orange** — connecting
   - **green** — connected ✅
   - **red** — closed (test server not reachable)
3. With the **heartbeat** running, the simulator replies with a JPEG to
   `Red Dog:SIMULATOR_IMAGE` on each beat — the dashboard's live image updates.
4. Sending `servodirect` / `servo` / `motor` to `Lost sheep Bo:CARCOMMAND`
   steers/throttles the simulated car.

## Troubleshooting

- **Button stays red/violet** — the test server isn't listening on
  `:8080/eventbus`, or the SockJS path/prefix doesn't match. Confirm `npm start`
  is running and reachable.
- **No images** — images are heartbeat-driven; make sure the heartbeat toggle is
  on (heartbeats go to `Velvet ears:HEARTBEAT`).
- **Address mismatch** — the dashboard addresses in `test-dashboard/server.js`
  must equal the simulator's `RemoteConfigEditor` defaults (`callsign:SUFFIX`),
  never bare callsigns.

## Related

- [issue #21](https://github.com/rc-dukes/dash2/issues/21) — the test dashboard (Node.js, ADR Accepted)
- [issue #16](https://github.com/rc-dukes/dash2/issues/16) — make remote-control URL/callsigns configurable, watchdog optional
- [docs/remote-control.md](./remote-control.md) — the protocol this test env exercises
