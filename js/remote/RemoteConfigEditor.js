const LOCAL_STORAGE_KEY = "dash_RemoteConfig";

const defaultConfig = {
  busUrl: "http://localhost:8080/eventbus",
  watchdogEnabled: true,
  debugHeartbeat: true,
  // EventBus addresses follow the documented callsign + responsibility
  // convention (callsign + ":" + suffix), never a bare callsign.
  heartbeatCallsign: "Velvet ears",
  heartbeatAddressSuffix: "HEARTBEAT",
  carCallsign: "Lost sheep Bo",
  carAddressSuffix: "CARCOMMAND",
  imageServerCallsign: "Red Dog",
  imageAddressSuffix: "SIMULATOR_IMAGE",
  imageMimeType: "image/jpeg",
  imageQuality: null
};

const configFields = {
  busUrl: { type: "text", width: 240 },
  watchdogEnabled: { type: "boolean" },
  debugHeartbeat: { type: "boolean" },
  heartbeatCallsign: { type: "text", width: 160 },
  heartbeatAddressSuffix: { type: "text", width: 160 },
  carCallsign: { type: "text", width: 160 },
  carAddressSuffix: { type: "text", width: 160 },
  imageServerCallsign: { type: "text", width: 160 },
  imageAddressSuffix: { type: "text", width: 160 },
  imageMimeType: { type: "text", width: 120 },
  imageQuality: { type: "numberOrNull", width: 70 }
};

export default class RemoteConfigEditor {
  constructor() {
    this._config = Object.assign({}, defaultConfig);
    this.configForm = document.getElementById("remote-config-form");

    let storedConfig = {};
    try {
      storedConfig = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
    } catch (e) {}

    for (const key of Object.keys(this._config)) {
      if (storedConfig[key] !== undefined)
        this._config[key] = this._normalizeValue(key, storedConfig[key]);
    }

    this._renderConfigFields();
    document.getElementById("save-config-button").addEventListener("click", this._saveConfigFields.bind(this));
    document.getElementById("restore-defaults-config-button").addEventListener("click", this._restoreDefaults.bind(this));
  }

  get config() {
    return Object.assign({}, this._config);
  }

  _renderConfigFields() {
    while (this.configForm.firstChild)
      this.configForm.removeChild(this.configForm.firstChild);

    for (const key of Object.keys(this._config))
      this.configForm.appendChild(this._createConfigField(key, this._config[key]));
  }

  _createConfigField(key, value) {
    const field = configFields[key];
    const inputId = `remote-config-field-${key}`;
    const changedClass = this._valueChanged(key, value) ? "is-danger" : "";
    const valueAttr = value === null ? "" : this._escapeAttribute(value);
    let controlHtml;

    if (field.type === "boolean") {
      controlHtml =
        `<label class="checkbox has-text-grey-light">
            <input id="${inputId}" name="${key}" type="checkbox" ${value ? "checked" : ""} />
          </label>`;
    } else {
      controlHtml =
        `<input id="${inputId}" name="${key}" class="input is-small ${changedClass}" type="text" style="width: ${field.width}px; border-width: 2px;" value="${valueAttr}" />`;
    }

    const html =
      `<div class="field is-horizontal">
          <div class="field-label is-small" style="flex-grow: 100;">
              <label class="label has-text-grey-light" for="${inputId}">${key}</label>
          </div>
          <div class="field-body">
              <div class="field">
                  <div class="control" style="margin-right: 16px;">
                      ${controlHtml}
                  </div>
              </div>
          </div>
      </div>`;

    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content.firstChild;
  }

  _saveConfigFields() {
    for (const key of Object.keys(this._config)) {
      const fieldDom = document.getElementById(`remote-config-field-${key}`);
      this._config[key] = this._valueFromField(key, fieldDom);

      if (configFields[key].type !== "boolean") {
        if (this._valueChanged(key, this._config[key]))
          fieldDom.classList.add("is-danger");
        else
          fieldDom.classList.remove("is-danger");
      }
    }

    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this._config));
    } catch (e) {}
  }

  _restoreDefaults() {
    this._config = Object.assign({}, defaultConfig);

    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}

    this._renderConfigFields();
  }

  _valueFromField(key, fieldDom) {
    const field = configFields[key];

    if (field.type === "boolean")
      return fieldDom.checked;

    if (field.type === "numberOrNull") {
      const value = fieldDom.value.trim();
      if (value === "")
        return null;
      return this._parseNullableNumber(value);
    }

    return fieldDom.value;
  }

  _normalizeValue(key, value) {
    const field = configFields[key];

    if (field.type === "boolean")
      return value === true;

    if (field.type === "numberOrNull") {
      if (value === null || value === "")
        return null;
      return this._parseNullableNumber(value);
    }

    return value;
  }

  _parseNullableNumber(value) {
    const parsedValue = Number.parseFloat(value);
    if (Number.isNaN(parsedValue))
      return null;
    return parsedValue;
  }

  _escapeAttribute(value) {
    return value.toString()
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  _valueChanged(key, value) {
    return value !== defaultConfig[key];
  }
}

RemoteConfigEditor.defaultConfig = defaultConfig;
