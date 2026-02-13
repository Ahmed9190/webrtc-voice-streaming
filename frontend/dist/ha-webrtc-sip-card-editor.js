var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { i, n, r, a as i$1, D as DEFAULT_CONFIG, x, t } from "./constants.js";
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp2(target, key, result);
  return result;
};
let WebRTCSipCardEditor = class extends i$1 {
  setConfig(config) {
    this._config = __spreadValues(__spreadValues({}, DEFAULT_CONFIG), config);
  }
  render() {
    if (!this.hass || !this._config) {
      return x``;
    }
    return x`
      <div class="card-config">
        <ha-textfield label="Title" .value="${this._config.title || ""}" .configValue="${"title"}" @input="${this._valueChanged}"></ha-textfield>

        <ha-textfield label="Server URL" .value="${this._config.server_url}" .configValue="${"server_url"}" @input="${this._valueChanged}"></ha-textfield>

        <ha-textfield label="Username" .value="${this._config.username}" .configValue="${"username"}" @input="${this._valueChanged}"></ha-textfield>

        <ha-textfield
          label="Password"
          type="password"
          .value="${this._config.password}"
          .configValue="${"password"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Display Name"
          .value="${this._config.display_name || ""}"
          .configValue="${"display_name"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="STUN Servers (comma-separated)"
          .value="${this._config.stun_servers ? this._config.stun_servers.join(",") : (DEFAULT_CONFIG.stun_servers || []).join(",")}"
          .configValue="${"stun_servers"}"
          @input="${this._stunServersChanged}"
        ></ha-textfield>
        <div class="switch-container">
          <label class="switch-label">Use Secure Connection</label>
          <ha-switch .checked="${this._config.use_secure !== false}" .configValue="${"use_secure"}" @change="${this._valueChanged}"></ha-switch>
        </div>

        <div class="switch-container">
          <label class="switch-label">Debug Mode</label>
          <ha-switch .checked="${this._config.debug === true}" .configValue="${"debug"}" @change="${this._valueChanged}"></ha-switch>
        </div>

        <h3>Contacts</h3>
        ${this._config.contacts.map(
      (contact, index) => x`
            <div class="contact-row">
              <ha-textfield
                label="Name"
                .value="${contact.name}"
                .contactIndex="${index}"
                .contactField="${"name"}"
                @input="${this._contactChanged}"
              ></ha-textfield>

              <ha-textfield
                label="Extension"
                .value="${contact.extension}"
                .contactIndex="${index}"
                .contactField="${"extension"}"
                @input="${this._contactChanged}"
              ></ha-textfield>

              <ha-textfield
                label="Icon"
                .value="${contact.icon || ""}"
                .contactIndex="${index}"
                .contactField="${"icon"}"
                @input="${this._contactChanged}"
              ></ha-textfield>

              <ha-icon-button .label="Delete" .contactIndex="${index}" @click="${this._deleteContact}"><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
            </div>
          `
    )}

        <ha-button @click="${this._addContact}"> Add Contact </ha-button>
      </div>
    `;
  }
  _stunServersChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const value = target.value;
    const configValue = target.configValue;
    const stunServers = value ? value.split(",").map((url) => url.trim()).filter((url) => url) : [];
    this._config = __spreadProps(__spreadValues({}, this._config), {
      [configValue]: stunServers
    });
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    let value = target.value;
    const configValue = target.configValue;
    if (target.tagName === "HA-SWITCH") {
      value = target.checked;
    } else if (target.tagName === "HA-SELECT") {
      value = target.value;
    } else if (target.tagName === "MWC-LIST-ITEM") {
      value = target.value || target.selected;
    }
    const currentValue = this[`_${configValue}`];
    if (currentValue === value) {
      return;
    }
    this._config = __spreadProps(__spreadValues({}, this._config), {
      [configValue]: value
    });
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
  _contactChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const value = target.value;
    const contactIndex = target.contactIndex;
    const contactField = target.contactField;
    const contacts = [...this._config.contacts];
    contacts[contactIndex] = __spreadProps(__spreadValues({}, contacts[contactIndex]), {
      [contactField]: value
    });
    this._config = __spreadProps(__spreadValues({}, this._config), {
      contacts
    });
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
  _addContact() {
    if (!this._config || !this.hass) {
      return;
    }
    const contacts = [...this._config.contacts];
    contacts.push({
      name: "",
      extension: "",
      icon: "mdi:account"
    });
    this._config = __spreadProps(__spreadValues({}, this._config), {
      contacts
    });
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
  _deleteContact(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const contactIndex = target.contactIndex;
    const contacts = [...this._config.contacts];
    contacts.splice(contactIndex, 1);
    this._config = __spreadProps(__spreadValues({}, this._config), {
      contacts
    });
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
};
WebRTCSipCardEditor.styles = i`
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
    }

    ha-textfield {
      width: 100%;
    }

    .contact-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .contact-row ha-textfield {
      flex: 1;
    }

    ha-icon-button {
      --mdc-icon-button-size: 40px;
      align-self: center;
      margin-top: 16px; /* Align with text fields */
      color: var(--error-color, #ff0000);
      cursor: pointer;
    }

    h3 {
      margin: 8px 0;
      color: var(--primary-text-color);
    }

    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .switch-label {
      display: inline-block;
      margin-right: 8px;
      margin-bottom: 0;
      vertical-align: middle;
      align-self: center;
      color: var(--primary-text-color);
      font-size: 14px;
    }

    .switch-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }

    .switch-container ha-switch {
      margin-left: auto;
    }
  `;
__decorateClass([
  n({ attribute: false })
], WebRTCSipCardEditor.prototype, "hass", 2);
__decorateClass([
  n({ attribute: false })
], WebRTCSipCardEditor.prototype, "lovelace", 2);
__decorateClass([
  r()
], WebRTCSipCardEditor.prototype, "_config", 2);
WebRTCSipCardEditor = __decorateClass([
  t("ha-webrtc-sip-card-editor")
], WebRTCSipCardEditor);
export {
  WebRTCSipCardEditor
};
