# Car Models

Dash renders the simulator vehicle through `js/objects/CarObject.js` and the
legacy `TDSLoader`, so built-in models use 3DS geometry exposed as base64 data
URLs.

## Built-in Models

| Selector label | Module | Source asset | Notes |
|----------------|--------|--------------|-------|
| General Lee | `models/generalLee.js` | `models/GeneralLee.3ds` | Default model for the `rc-dukes` fork. Preserves the model's embedded 3DS materials. |
| SUV | `models/suv.js` | embedded 3DS data | Original Dash default, retained as a selectable built-in model. |

The built-in selector is shown next to **Load Car**. **Load Car** remains a
runtime-only custom 3DS loader and does not add the selected file to the
built-in selector.

## Adding More Models

Add a model module that exposes:

- `base64data`: a 3DS data URL.
- `carColor`: fallback 2D body color.
- `wheelColor`: fallback 2D wheel color.
- `skin(object)`: optional 3D material/layer setup after `TDSLoader` parses the
  model.

Then register the module in `CarObject`'s built-in model map.

## Source And License

`models/GeneralLee.3ds` was added for issue #17. Keep the original source and
license information with any future replacement or improved model asset before
redistributing it in this repository.
