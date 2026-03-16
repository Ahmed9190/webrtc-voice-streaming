import { LitElement, html, css, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, VoiceReceivingCardConfig } from "./types";

@customElement("voice-receiving-card-editor")
export class VoiceReceivingCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: VoiceReceivingCardConfig;

  public setConfig(config: VoiceReceivingCardConfig): void {
    this._config = config;
  }

  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const configValue = target.configValue;

    if (!configValue) {
      return;
    }

    const value = target.checked !== undefined ? target.checked : target.value;

    if (this._config[configValue] === value) {
      return;
    }

    const newConfig = { ...this._config };
    if (value === "" && target.checked === undefined) {
      delete newConfig[configValue];
    } else {
      newConfig[configValue] = value;
    }
    this._config = newConfig;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <ha-textfield label="Title" .value=${this._config.title || ""} .configValue=${"title"} @input=${this._valueChanged}></ha-textfield>
        <ha-textfield
          label="Server URL (optional)"
          .value=${this._config.server_url || ""}
          .configValue=${"server_url"}
          helper="Defaults to localhost:8080/ws"
          @input=${this._valueChanged}
        ></ha-textfield>
        <div class="side-by-side">
          <ha-formfield label="Auto Play">
            <ha-switch .checked=${this._config.auto_play !== false} .configValue=${"auto_play"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
        </div>
      </div>
    `;
  }

  static styles = css`
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .side-by-side {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    ha-textfield {
      width: 100%;
    }
    ha-formfield {
      padding-bottom: 8px;
    }
  `;
}
