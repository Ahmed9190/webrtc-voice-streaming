import { LitElement, html, css, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, VoiceStreamingCardConfig } from "./types";

@customElement("voice-sending-card-editor")
export class VoiceSendingCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: VoiceStreamingCardConfig;

  public setConfig(config: VoiceStreamingCardConfig): void {
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
          helper="WebRTC Server (WS) e.g. localhost:8080/ws"
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-textfield
          label="Audio Stream URL (optional)"
          .value=${this._config.stream_url || ""}
          .configValue=${"stream_url"}
          helper="Audio playback URL e.g. http://192.168.1.10:8081/stream/latest.mp3"
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-textfield
          label="Target Media Player (optional)"
          .value=${this._config.target_media_player || ""}
          .configValue=${"target_media_player"}
          helper="Entity ID e.g. media_player.living_room_speaker"
          @input=${this._valueChanged}
        ></ha-textfield>
        <div class="side-by-side">
          <ha-formfield label="Auto Start">
            <ha-switch .checked=${this._config.auto_start !== false} .configValue=${"auto_start"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
          <ha-formfield label="Noise Suppression">
            <ha-switch .checked=${this._config.noise_suppression !== false} .configValue=${"noise_suppression"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
        </div>
        <div class="side-by-side">
          <ha-formfield label="Echo Cancellation">
            <ha-switch .checked=${this._config.echo_cancellation !== false} .configValue=${"echo_cancellation"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
          <ha-formfield label="Auto Gain Control">
            <ha-switch .checked=${this._config.auto_gain_control !== false} .configValue=${"auto_gain_control"} @change=${this._valueChanged}></ha-switch>
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
