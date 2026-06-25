# Remote Control via vert.x

This document describes the **remote control** feature added by the
[`rc-dukes`](https://github.com/rc-dukes) fork. It is **not** part of the
original [mattbradley/dash](https://github.com/mattbradley/dash) project.

It lets the simulated car be driven by an external
[vert.x](https://vertx.io/) application over the vert.x **EventBus** (via
SockJS), and streams the simulator view back to a debug image server. The
external backend is the RC-car project [`rc-dukes/dukes`](https://github.com/rc-dukes/dukes).

## Architecture

```
+---------------------------+        SockJS / vert.x EventBus        +-----------------------+
|  Dash simulator (browser) |  <-----------------------------------> |  vert.x EventBus      |
|                           |        configurable EventBus URL       |  bridge (rc-dukes/    |
|  js/remote/               |                                        |  dukes backend)       |
|    SimulatorVerticle.js   |                                        +-----------------------+
+---------------------------+
```

Client libraries loaded in `index.html`:

- `vendor/sockjs.0.3.4.min.js`
- `vendor/vertx-eventbus.js` (provides the global `EventBus`)

Implementation: `js/remote/SimulatorVerticle.js`, wired into the simulator in
`js/Simulator.js` (`onEnableRemoteControl`, `onHeartBeat`, `onSendImage`).

## Enabling

The feature is toggled by the **remote** mode button in the simulator UI
(`Simulator.onEnableRemoteControl`). On activation it constructs a
`SimulatorVerticle` from the current remote configuration and opens the
connection.

A running vert.x EventBus bridge (from `rc-dukes/dukes`) must be reachable at
the configured address, otherwise the connection state stays red. The default
address is `http://localhost:8080/eventbus`.

## Configuration

Remote settings are editable in the simulator config panel under
**Remote Config** and are persisted in browser `localStorage` under
`dash_RemoteConfig`. The restore-defaults button removes the stored remote
configuration and returns to the legacy defaults.

| Setting               | Default                         | Purpose |
|-----------------------|---------------------------------|---------|
| `busUrl`              | `http://localhost:8080/eventbus`| vert.x EventBus bridge URL |
| `watchdogEnabled`     | `true`                          | Registers the heartbeat/watchdog handler when remote mode starts |
| `debugHeartbeat`      | `true`                          | Logs heartbeat message bodies to the console |
| `heartbeatCallsign`   | `Velvet ears`                   | Watchdog / heartbeat inbound address |
| `carCallsign`         | `Lost sheep Bo`                 | Car-control inbound address |
| `imageServerCallsign` | `Red Dog`                       | Debug-image outbound address prefix |
| `imageAddressSuffix`  | `SIMULATOR_IMAGE`               | Debug-image outbound address suffix |
| `imageMimeType`       | `image/jpeg`                    | MIME type passed to `canvas.toDataURL()` |
| `imageQuality`        | blank                           | Optional quality value passed to `canvas.toDataURL()` |

## EventBus addresses ("callsigns")

The fork uses Dukes-of-Hazzard-themed callsigns as default EventBus addresses.
They can be changed in **Remote Config**:

| Config key            | Default callsign | Role                         | Direction (relative to simulator) |
|-----------------------|------------------|------------------------------|-----------------------------------|
| `heartbeatCallsign`   | `Velvet ears`    | Watchdog / heartbeat         | inbound, if watchdog is enabled   |
| `carCallsign`         | `Lost sheep Bo`  | Car control commands         | inbound                           |
| `imageServerCallsign` | `Red Dog`        | Debug image server           | outbound (`sendImage` publishes)  |

- **Heartbeat** (`Velvet ears` by default): when `watchdogEnabled` is on, each
  received message increments `heartBeatCount`, flashes the heartbeat icon, and
  triggers an image reply (`onSendImage`). When `watchdogEnabled` is off, this
  handler is not registered.
- **Image stream** (`Red Dog`): the simulator publishes a JPEG data URL of the
  current Three.js canvas to `<imageServerCallsign>:<imageAddressSuffix>`,
  which defaults to `Red Dog:SIMULATOR_IMAGE`.

## Control message schema

Car control messages arrive on `carCallsign` (`Lost sheep Bo` by default) and
are handled by `carMessageHandler`. The message body (`carjo`) is JSON with a
`type` field:

### `type: "servodirect"`
Direct steering position.

| Field      | Value        | Effect                                            |
|------------|--------------|---------------------------------------------------|
| `position` | `-100`..`100`| Sets steering to `position / 100` (i.e. `-1`..`1`) |

### `type: "servo"`
Incremental / relative steering.

| Field      | Value     | Effect                 |
|------------|-----------|------------------------|
| `position` | `left`    | `steer -= 0.01`        |
| `position` | `right`   | `steer += 0.01`        |
| `position` | `center`  | `steer = 0`            |

### `type: "motor"`
Throttle / braking.

| Field   | Value   | Effect            |
|---------|---------|-------------------|
| `speed` | `up`    | `gas += 0.01`     |
| `speed` | `down`  | `gas -= 0.01`     |
| `speed` | `brake` | `brake += 0.01`   |
| `speed` | `stop`  | `gas = 0; brake = 1` |

Values are accumulated into a `RemoteControl` instance (`gas`, `brake`,
`steer`) which the simulator reads each frame while remote mode is enabled.

## Connection state

`SimulatorVerticle.stateColor()` maps the EventBus state to the remote-mode
button color:

| State        | Color   |
|--------------|---------|
| no EventBus  | violet  |
| connecting   | orange  |
| open         | green   |
| closing      | orange  |
| closed       | red     |

## Known limitations / TODOs

- `RemoteControl`'s constructor accepts `gas`/`brake`/`steer` parameters but
  ignores them (always initializes to `0`).
- `js/remote/Webserver.js` is non-functional (references `fs`/`http` that are
  not imported under those names, plus undefined `buffers`/`emitter`) and is not
  part of the active vert.x path.

These are tracked in the project issues.
