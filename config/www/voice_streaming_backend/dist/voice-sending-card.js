import{i as t,_ as e,n as i,r as a,a as s,b as n,t as o,e as c,s as r,W as l}from"./styles-YY3p615I.js";let h=class extends s{setConfig(t){this._config=t}_valueChanged(t){if(!this._config||!this.hass)return;const e=t.target;if(this[`_${e.configValue}`]!==e.value){if(e.configValue)if(""===e.value){const t={...this._config};delete t[e.configValue],this._config=t}else this._config={...this._config,[e.configValue]:void 0!==e.checked?e.checked:e.value};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}}render(){return this.hass&&this._config?n`
      <div class="card-config">
        <ha-textfield label="Title" .value=${this._config.title||""} .configValue=${"title"} @input=${this._valueChanged}></ha-textfield>
        <ha-textfield
          label="Server URL (optional)"
          .value=${this._config.server_url||""}
          .configValue=${"server_url"}
          helper="Defaults to localhost:8080/ws"
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-textfield
          label="Target Media Player (optional)"
          .value=${this._config.target_media_player||""}
          .configValue=${"target_media_player"}
          helper="Entity ID e.g. media_player.living_room_speaker"
          @input=${this._valueChanged}
        ></ha-textfield>
        <div class="side-by-side">
          <ha-formfield label="Auto Start">
            <ha-switch .checked=${!1!==this._config.auto_start} .configValue=${"auto_start"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
          <ha-formfield label="Noise Suppression">
            <ha-switch .checked=${!1!==this._config.noise_suppression} .configValue=${"noise_suppression"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
        </div>
        <div class="side-by-side">
          <ha-formfield label="Echo Cancellation">
            <ha-switch .checked=${!1!==this._config.echo_cancellation} .configValue=${"echo_cancellation"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
          <ha-formfield label="Auto Gain Control">
            <ha-switch .checked=${!1!==this._config.auto_gain_control} .configValue=${"auto_gain_control"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
        </div>
      </div>
    `:n``}};h.styles=t`
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
  `,e([i({attribute:!1})],h.prototype,"hass",void 0),e([a()],h.prototype,"_config",void 0),h=e([o("voice-sending-card-editor")],h);let d=class extends s{constructor(){super(...arguments),this.status="disconnected",this.errorMessage="",this.latency=0,this.webrtc=null,this.animationFrame=null}static get styles(){return[r,t`
        /* Add specific styles if needed */
      `]}static async getConfigElement(){return document.createElement("voice-sending-card-editor")}static getStubConfig(){return{type:"custom:voice-sending-card",title:"Voice Sender",auto_start:!1,noise_suppression:!0,echo_cancellation:!0,auto_gain_control:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this.config=t,this.webrtc&&this.webrtc.updateConfig({serverUrl:this.config.server_url,noiseSuppression:this.config.noise_suppression,echoCancellation:this.config.echo_cancellation,autoGainControl:this.config.auto_gain_control})}getCardSize(){return 3}connectedCallback(){super.connectedCallback(),this.webrtc||(this.webrtc=new l({serverUrl:this.config?.server_url,noiseSuppression:this.config?.noise_suppression,echoCancellation:this.config?.echo_cancellation,autoGainControl:this.config?.auto_gain_control})),this.webrtc.addEventListener("state-changed",t=>{this.status=t.detail.state,t.detail.error?this.errorMessage=t.detail.error:this.errorMessage="",this.requestUpdate()}),this.webrtc.addEventListener("audio-data",t=>{t.detail.timestamp&&(this.latency=Date.now()-1e3*t.detail.timestamp)}),!0===this.config?.auto_start&&this.toggleSending()}disconnectedCallback(){super.disconnectedCallback(),this.stopVisualization(),this.webrtc?.stop()}async toggleSending(){"connected"===this.status||"connecting"===this.status?(this.webrtc?.stop(),this.stopVisualization(),await this.manageMediaPlayer("stop")):(await(this.webrtc?.startSending()),this.startVisualization(),await this.manageMediaPlayer("play"))}async manageMediaPlayer(t){if(this.config.target_media_player&&this.hass)try{if("play"===t){const t=`http://${window.location.hostname}:8081/stream/latest.mp3`;await this.hass.callService("media_player","play_media",{entity_id:this.config.target_media_player,media_content_id:t,media_content_type:"music"})}else await this.hass.callService("media_player","media_stop",{entity_id:this.config.target_media_player})}catch(t){console.error("Failed to control media player:",t),this.errorMessage=`Media Player Error: ${t.message}`}}startVisualization(){if(!this.canvas||!this.webrtc)return;const t=this.canvas.getContext("2d");if(!t)return;const e=()=>{const i=this.webrtc?.getAnalyser();if(!i)return void(this.animationFrame=requestAnimationFrame(e));const a=i.frequencyBinCount,s=new Uint8Array(a);i.getByteFrequencyData(s),t.fillStyle="rgb(240, 240, 240)",t.fillRect(0,0,this.canvas.width,this.canvas.height);const n=this.canvas.width/a*2.5;let o,c=0;for(let e=0;e<a;e++)o=s[e]/255*this.canvas.height,t.fillStyle=`rgb(${o+100}, 50, 50)`,t.fillRect(c,this.canvas.height-o/2,n,o),c+=n+1;this.animationFrame=requestAnimationFrame(e)};e()}stopVisualization(){this.animationFrame&&(cancelAnimationFrame(this.animationFrame),this.animationFrame=null)}render(){if(!this.config)return n``;const t="connected"===this.status,e=t?"🛑":"🎤";return this.errorMessage||this.status,n`
      <ha-card>
        <div class="header">
          <div class="title">${this.config.title||this.config.name||"Voice Send"}</div>
          <div class="status-badge ${this.status}">${this.status}</div>
        </div>

        <div class="content">
          <div class="visualization">
            <canvas width="300" height="64"></canvas>
          </div>

          <div class="controls">
            <button
              class="main-button ${t?"active":""} ${"error"===this.status?"error":""}"
              @click=${this.toggleSending}
              ?disabled=${"connecting"===this.status}
            >
              ${e}
            </button>
          </div>

          <div class="stats">${t?n`<span>Latency: ${this.latency}ms</span>`:""}</div>

          ${this.errorMessage?n`<div class="error-message">${this.errorMessage}</div>`:""}
        </div>
      </ha-card>
    `}};e([i({attribute:!1})],d.prototype,"hass",void 0),e([a()],d.prototype,"config",void 0),e([a()],d.prototype,"status",void 0),e([a()],d.prototype,"errorMessage",void 0),e([a()],d.prototype,"latency",void 0),e([c("canvas")],d.prototype,"canvas",void 0),d=e([o("voice-sending-card")],d),window.customCards=window.customCards||[],window.customCards.push({type:"voice-sending-card",name:"Voice Sending Card",description:"Send voice audio via WebRTC",preview:!0,editor:"voice-sending-card-editor"});export{d as VoiceSendingCard};
//# sourceMappingURL=voice-sending-card.js.map
