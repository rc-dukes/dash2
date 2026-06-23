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
|                           |        http://localhost:8080/eventbus  |  bridge (rc-dukes/    |
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
(`Simulator.onEnableRemoteControl`). On first activation it constructs a
`SimulatorVerticle` pointing at the EventBus URL and opens the connection.

> **Note:** The EventBus URL is currently **hardcoded** to
> `http://localhost:8080/eventbus` in `js/Simulator.js`
> (`// @TODO - make configurable`). See the configurability issue.

A running vert.x EventBus bridge (from `rc-dukes/dukes`) must be reachable at
that address, otherwise the connection state stays red.

## EventBus addresses ("callsigns")

The fork uses Dukes-of-Hazzard-themed callsigns as EventBus addresses. They are
defined as constants at the top of `SimulatorVerticle.js`:

| Constant         | Address (callsign) | Role                         | Direction (relative to simulator) |
|------------------|--------------------|------------------------------|-----------------------------------|
| `CALLSIGN_FLASH` | `Velvet ears`      | Watchdog / heartbeat         | inbound (handler registered)      |
| `CALLSIGN_BO`    | `Lost sheep Bo`    | Car control commands         | inbound (handler registered)      |
| `CALLSIGN_ROSCO` | `Red Dog`          | Debug image server           | outbound (`sendImage` publishes)  |

- **Heartbeat** (`Velvet ears`): each received message increments
  `heartBeatCount`, flashes the heartbeat icon, and triggers an image reply
  (`onSendImage`).
- **Image stream** (`Red Dog`): the simulator publishes a JPEG data URL of the
  current Three.js canvas to `<Red Dog>:SIMULATOR_IMAGE`.

## Control message schema

Car control messages arrive on `Lost sheep Bo` and are handled by
`carMessageHandler`. The message body (`carjo`) is JSON with a `type` field:

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

- EventBus URL is hardcoded (`Simulator.js`); should be configurable.
- Callsign addresses are hardcoded constants; should be configurable.
- The heartbeat/watchdog is always-on when remote mode is enabled; it should be
  optional.
- `RemoteControl`'s constructor accepts `gas`/`brake`/`steer` parameters but
  ignores them (always initializes to `0`).
- `js/remote/Webserver.js` is non-functional (references `fs`/`http` that are
  not imported under those names, plus undefined `buffers`/`emitter`) and is not
  part of the active vert.x path.

These are tracked in the project issues.
