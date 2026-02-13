function t(t,e,s,i){var o,n=arguments.length,r=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(r=(n<3?o(r):n>3?o(e,s,r):o(e,s))||r);return n>3&&r&&Object.defineProperty(e,s,r),r}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),o=new WeakMap;let n=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=o.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&o.set(e,t))}return t}toString(){return this.cssText}};const r=(t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new n(s,t,i)},a=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:c,defineProperty:h,getOwnPropertyDescriptor:l,getOwnPropertyNames:d,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,f=globalThis,g=f.trustedTypes,m=g?g.emptyScript:"",$=f.reactiveElementPolyfillSupport,_=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},y=(t,e)=>!c(t,e),v={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:y};Symbol.metadata??=Symbol("metadata"),f.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=v){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&h(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:o}=l(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const n=i?.call(this);o?.call(this,e),this.requestUpdate(t,n,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??v}static _$Ei(){if(this.hasOwnProperty(_("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(_("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(_("properties"))){const t=this.properties,e=[...d(t),...p(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),o=e.litNonce;void 0!==o&&i.setAttribute("nonce",o),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const o=(void 0!==s.converter?.toAttribute?s.converter:b).toAttribute(e,s.type);this._$Em=t,null==o?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=i;const n=o.fromAttribute(e,t.type);this[i]=n??this._$Ej?.get(i)??n,this._$Em=null}}requestUpdate(t,e,s,i=!1,o){if(void 0!==t){const n=this.constructor;if(!1===i&&(o=this[t]),s??=n.getPropertyOptions(t),!((s.hasChanged??y)(o,e)||s.useDefault&&s.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:o},n){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==o||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[_("elementProperties")]=new Map,w[_("finalized")]=new Map,$?.({ReactiveElement:w}),(f.reactiveElementVersions??=[]).push("2.1.2");const S=globalThis,A=t=>t,C=S.trustedTypes,E=C?C.createPolicy("lit-html",{createHTML:t=>t}):void 0,x="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,P="?"+k,M=`<${P}>`,R=document,T=()=>R.createComment(""),U=t=>null===t||"object"!=typeof t&&"function"!=typeof t,O=Array.isArray,N="[ \t\n\f\r]",H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,W=/-->/g,D=/>/g,z=RegExp(`>|${N}(?:([^\\s"'>=/]+)(${N}*=${N}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),j=/'/g,L=/"/g,I=/^(?:script|style|textarea|title)$/i,B=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),V=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),F=new WeakMap,G=R.createTreeWalker(R,129);function J(t,e){if(!O(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(e):e}const K=(t,e)=>{const s=t.length-1,i=[];let o,n=2===e?"<svg>":3===e?"<math>":"",r=H;for(let e=0;e<s;e++){const s=t[e];let a,c,h=-1,l=0;for(;l<s.length&&(r.lastIndex=l,c=r.exec(s),null!==c);)l=r.lastIndex,r===H?"!--"===c[1]?r=W:void 0!==c[1]?r=D:void 0!==c[2]?(I.test(c[2])&&(o=RegExp("</"+c[2],"g")),r=z):void 0!==c[3]&&(r=z):r===z?">"===c[0]?(r=o??H,h=-1):void 0===c[1]?h=-2:(h=r.lastIndex-c[2].length,a=c[1],r=void 0===c[3]?z:'"'===c[3]?L:j):r===L||r===j?r=z:r===W||r===D?r=H:(r=z,o=void 0);const d=r===z&&t[e+1].startsWith("/>")?" ":"";n+=r===H?s+M:h>=0?(i.push(a),s.slice(0,h)+x+s.slice(h)+k+d):s+k+(-2===h?e:d)}return[J(t,n+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class Z{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let o=0,n=0;const r=t.length-1,a=this.parts,[c,h]=K(t,e);if(this.el=Z.createElement(c,s),G.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=G.nextNode())&&a.length<r;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(x)){const e=h[n++],s=i.getAttribute(t).split(k),r=/([.?@])?(.*)/.exec(e);a.push({type:1,index:o,name:r[2],strings:s,ctor:"."===r[1]?et:"?"===r[1]?st:"@"===r[1]?it:tt}),i.removeAttribute(t)}else t.startsWith(k)&&(a.push({type:6,index:o}),i.removeAttribute(t));if(I.test(i.tagName)){const t=i.textContent.split(k),e=t.length-1;if(e>0){i.textContent=C?C.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],T()),G.nextNode(),a.push({type:2,index:++o});i.append(t[e],T())}}}else if(8===i.nodeType)if(i.data===P)a.push({type:2,index:o});else{let t=-1;for(;-1!==(t=i.data.indexOf(k,t+1));)a.push({type:7,index:o}),t+=k.length-1}o++}}static createElement(t,e){const s=R.createElement("template");return s.innerHTML=t,s}}function Q(t,e,s=t,i){if(e===V)return e;let o=void 0!==i?s._$Co?.[i]:s._$Cl;const n=U(e)?void 0:e._$litDirective$;return o?.constructor!==n&&(o?._$AO?.(!1),void 0===n?o=void 0:(o=new n(t),o._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=o:s._$Cl=o),void 0!==o&&(e=Q(t,o._$AS(t,e.values),o,i)),e}class X{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??R).importNode(e,!0);G.currentNode=i;let o=G.nextNode(),n=0,r=0,a=s[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new Y(o,o.nextSibling,this,t):1===a.type?e=new a.ctor(o,a.name,a.strings,this,t):6===a.type&&(e=new ot(o,this,t)),this._$AV.push(e),a=s[++r]}n!==a?.index&&(o=G.nextNode(),n++)}return G.currentNode=R,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Y{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),U(t)?t===q||null==t||""===t?(this._$AH!==q&&this._$AR(),this._$AH=q):t!==this._$AH&&t!==V&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>O(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==q&&U(this._$AH)?this._$AA.nextSibling.data=t:this.T(R.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=Z.createElement(J(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new X(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=F.get(t.strings);return void 0===e&&F.set(t.strings,e=new Z(t)),e}k(t){O(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const o of t)i===e.length?e.push(s=new Y(this.O(T()),this.O(T()),this,this.options)):s=e[i],s._$AI(o),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=A(t).nextSibling;A(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,o){this.type=1,this._$AH=q,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=o,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=q}_$AI(t,e=this,s,i){const o=this.strings;let n=!1;if(void 0===o)t=Q(this,t,e,0),n=!U(t)||t!==this._$AH&&t!==V,n&&(this._$AH=t);else{const i=t;let r,a;for(t=o[0],r=0;r<o.length-1;r++)a=Q(this,i[s+r],e,r),a===V&&(a=this._$AH[r]),n||=!U(a)||a!==this._$AH[r],a===q?t=q:t!==q&&(t+=(a??"")+o[r+1]),this._$AH[r]=a}n&&!i&&this.j(t)}j(t){t===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===q?void 0:t}}class st extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==q)}}class it extends tt{constructor(t,e,s,i,o){super(t,e,s,i,o),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??q)===V)return;const s=this._$AH,i=t===q&&s!==q||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,o=t!==q&&(s===q||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ot{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const nt=S.litHtmlPolyfillSupport;nt?.(Z,Y),(S.litHtmlVersions??=[]).push("3.3.2");const rt=globalThis;class at extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let o=i._$litPart$;if(void 0===o){const t=s?.renderBefore??null;i._$litPart$=o=new Y(e.insertBefore(T(),t),t,void 0,s??{})}return o._$AI(t),o})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return V}}at._$litElement$=!0,at.finalized=!0,rt.litElementHydrateSupport?.({LitElement:at});const ct=rt.litElementPolyfillSupport;ct?.({LitElement:at}),(rt.litElementVersions??=[]).push("4.2.2");const ht=t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},lt={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:y},dt=(t=lt,e,s)=>{const{kind:i,metadata:o}=s;let n=globalThis.litPropertyMetadata.get(o);if(void 0===n&&globalThis.litPropertyMetadata.set(o,n=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),n.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const o=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,o,t,!0,s)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const o=this[i];e.call(this,s),this.requestUpdate(i,o,t,!0,s)}}throw Error("Unsupported decorator location: "+i)};function pt(t){return(e,s)=>"object"==typeof s?dt(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}function ut(t){return pt({...t,state:!0,attribute:!1})}function ft(t,e){return(e,s,i)=>((t,e,s)=>(s.configurable=!0,s.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,s),s))(e,s,{get(){return(e=>e.renderRoot?.querySelector(t)??null)(this)}})}class gt extends EventTarget{constructor(t={}){super(),this.websocket=null,this.peerConnection=null,this.mediaStream=null,this.audioContext=null,this.analyser=null,this.state="disconnected",this.reconnectTimer=null,this.retryCount=0,this.maxRetries=5,this.config={noiseSuppression:!0,echoCancellation:!0,autoGainControl:!0},this.updateConfig(t)}updateConfig(t){this.config={...this.config,...void 0!==t.serverUrl&&{serverUrl:t.serverUrl},...void 0!==t.noiseSuppression&&{noiseSuppression:t.noiseSuppression},...void 0!==t.echoCancellation&&{echoCancellation:t.echoCancellation},...void 0!==t.autoGainControl&&{autoGainControl:t.autoGainControl}}}getState(){return this.state}getAnalyser(){return this.analyser}setState(t,e){this.state=t,this.dispatchEvent(new CustomEvent("state-changed",{detail:{state:t,error:e}}))}async startSending(){try{this.setState("connecting"),await this.connectWebSocket(),this.mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:this.config.echoCancellation,noiseSuppression:this.config.noiseSuppression,autoGainControl:this.config.autoGainControl,sampleRate:16e3,channelCount:1}}),this.setupAudioVisualization(this.mediaStream),this.setupPeerConnection(),this.mediaStream.getAudioTracks().forEach(t=>{this.peerConnection&&this.peerConnection.addTrack(t,this.mediaStream)}),this.sendWebSocketMessage({type:"start_sending"}),this.setState("connected")}catch(t){console.error("Failed to start sending:",t),this.cleanup(),this.setState("error",t.message)}}async startReceiving(t){try{this.setState("connecting"),await this.connectWebSocket(),this.peerConnection&&(this.peerConnection.close(),this.peerConnection=null),this.setupPeerConnection(),this.sendWebSocketMessage({type:"start_receiving",stream_id:t})}catch(t){console.error("[WebRTC] Failed to start receiving:",t),this.cleanup(),this.setState("error",t.message)}}getStreams(){this.websocket&&this.websocket.readyState===WebSocket.OPEN&&this.sendWebSocketMessage({type:"get_available_streams"})}stopStream(){this.websocket&&this.websocket.readyState===WebSocket.OPEN?(this.sendWebSocketMessage({type:"stop_stream"}),this.setState("connected")):this.setState("disconnected"),this.cleanupMedia()}stop(){this.websocket&&this.websocket.readyState===WebSocket.OPEN&&this.sendWebSocketMessage({type:"stop_stream"}),this.cleanup(),this.setState("disconnected")}setupPeerConnection(){this.peerConnection=new RTCPeerConnection({iceServers:[],bundlePolicy:"max-bundle",rtcpMuxPolicy:"require",sdpSemantics:"unified-plan"}),this.peerConnection.onicecandidate=t=>{t.candidate&&this.sendWebSocketMessage({type:"ice_candidate",candidate:t.candidate})},this.peerConnection.oniceconnectionstatechange=()=>{const t=this.peerConnection?.iceConnectionState;"failed"===t&&this.setState("error","ICE Connection Failed")},this.peerConnection.ontrack=t=>{t.streams&&t.streams[0]&&(this.setupAudioVisualization(t.streams[0]),this.setState("connected"),this.dispatchEvent(new CustomEvent("track",{detail:{stream:t.streams[0]}})))}}async connectWebSocket(){if(!this.websocket||this.websocket.readyState!==WebSocket.OPEN)return new Promise((t,e)=>{let s;if(this.config.serverUrl)try{let t=this.config.serverUrl;if(!t.match(/^(https?|wss?):\/\//)){t=`${"https:"===window.location.protocol?"https:":"http:"}//${t}`}const e=new URL(t);let i;i="https:"===e.protocol||"wss:"===e.protocol?"wss:":"ws:";const o=e.hostname,n=e.port,r=e.pathname||"/ws";s=n?`${i}//${o}:${n}${r}`:`${i}//${o}${r}`}catch(t){const s=`Invalid Server URL: ${this.config.serverUrl}`;return console.error(s,t),this.setState("error",s),void e(new Error(s))}else{const t=window.location.hostname;s=`${"https:"===window.location.protocol?"wss:":"ws:"}//${t}:8080/ws`}this.websocket=new WebSocket(s),this.websocket.onopen=()=>{this.retryCount=0,t()},this.websocket.onerror=t=>{console.error("WebSocket error:",t),e(t)},this.websocket.onclose=()=>{"connected"===this.state||"connecting"===this.state?this.handleReconnect():this.setState("disconnected")},this.websocket.onmessage=async t=>{await this.handleMessage(JSON.parse(t.data))}})}async handleMessage(t){switch(t.type){case"sender_ready":if(this.peerConnection){const t=await this.peerConnection.createOffer({offerToReceiveAudio:!1,offerToReceiveVideo:!1});await this.peerConnection.setLocalDescription(t),this.sendWebSocketMessage({type:"webrtc_offer",offer:{sdp:this.peerConnection.localDescription?.sdp,type:this.peerConnection.localDescription?.type}})}break;case"webrtc_answer":if(this.peerConnection)try{await this.peerConnection.setRemoteDescription(new RTCSessionDescription(t.answer))}catch(t){console.error("[WebRTC] Failed to set remote answer:",t),this.setState("error",`Failed to set remote answer: ${t.message}`)}break;case"webrtc_offer":if(this.peerConnection)try{const e=this.peerConnection.signalingState;if("stable"===e||"have-local-offer"===e){await this.peerConnection.setRemoteDescription(new RTCSessionDescription(t.offer));const e=await this.peerConnection.createAnswer();await this.peerConnection.setLocalDescription(e),this.sendWebSocketMessage({type:"webrtc_answer",answer:{sdp:this.peerConnection.localDescription?.sdp,type:this.peerConnection.localDescription?.type}})}else console.warn(`[WebRTC] Cannot process offer in state: ${e}`)}catch(t){console.error("[WebRTC] Failed to handle offer:",t),this.setState("error",`Failed to handle offer: ${t.message}`)}break;case"available_streams":this.dispatchEvent(new CustomEvent("streams-changed",{detail:{streams:t.streams}}));break;case"stream_available":this.dispatchEvent(new CustomEvent("stream-added",{detail:{streamId:t.stream_id}}));break;case"stream_ended":this.dispatchEvent(new CustomEvent("stream-removed",{detail:{streamId:t.stream_id}}));break;case"audio_data":this.dispatchEvent(new CustomEvent("audio-data",{detail:t}))}}sendWebSocketMessage(t){this.websocket&&this.websocket.readyState===WebSocket.OPEN&&this.websocket.send(JSON.stringify(t))}setupAudioVisualization(t){if(this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext)),this.analyser)return;this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=256;this.audioContext.createMediaStreamSource(t).connect(this.analyser)}handleReconnect(){if(this.retryCount<this.maxRetries){this.retryCount++;const t=Math.min(1e3*Math.pow(1.5,this.retryCount),3e4);this.setState("connecting",`Reconnecting in ${Math.round(t/1e3)}s...`),this.reconnectTimer=window.setTimeout(()=>{this.connectWebSocket().catch(()=>this.handleReconnect())},t)}else this.setState("error","Connection lost. Max retries reached.")}cleanupMedia(){this.mediaStream&&(this.mediaStream.getTracks().forEach(t=>t.stop()),this.mediaStream=null),this.peerConnection&&(this.peerConnection.close(),this.peerConnection=null),this.audioContext&&(this.audioContext.close(),this.audioContext=null,this.analyser=null)}cleanup(){this.reconnectTimer&&clearTimeout(this.reconnectTimer),this.cleanupMedia(),this.websocket&&(this.websocket.close(),this.websocket=null)}}const mt=r`
  :host {
    display: block;
    --card-primary-color: var(--primary-color, #03a9f4);
    --card-secondary-color: var(--secondary-color, #ff9800);
    --card-background-color: var(--card-background-color, white);
    --card-text-color: var(--primary-text-color, #212121);
    --success-color: var(--success-color, #4caf50);
    --warning-color: var(--warning-color, #ff9800);
    --error-color: var(--error-color, #f44336);
    --divider-color: var(--divider-color, #e0e0e0);
  }

  ha-card {
    display: flex;
    flex-direction: column;
    padding: 16px;
    height: 100%;
    box-sizing: border-box;
    background: var(--card-background-color);
    color: var(--card-text-color);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .title {
    font-size: 18px;
    font-weight: 500;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-badge.connected {
    background-color: rgba(76, 175, 80, 0.2);
    color: var(--success-color);
  }

  .status-badge.connecting {
    background-color: rgba(255, 152, 0, 0.2);
    color: var(--warning-color);
  }

  .status-badge.disconnected {
    background-color: rgba(244, 67, 54, 0.2);
    color: var(--error-color);
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }

  .controls {
    display: flex;
    gap: 16px;
  }

  .main-button {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: none;
    background: var(--divider-color);
    color: var(--card-text-color);
    font-size: 32px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .main-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  }

  .main-button:active {
    transform: scale(0.95);
  }

  .main-button.active {
    background: var(--success-color);
    color: white;
    animation: pulse 2s infinite;
  }

  .main-button.error {
    background: var(--error-color);
    color: white;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
  }

  .visualization {
    width: 100%;
    height: 64px;
    background: rgba(0,0,0,0.05);
    border-radius: 8px;
    overflow: hidden;
  }

  canvas {
    width: 100%;
    height: 100%;
  }

  .stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
  }

  .error-message {
    background-color: var(--error-color, #f44336);
    color: white;
    font-size: 14px;
    text-align: center;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 16px;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;export{gt as W,t as _,at as a,B as b,ft as e,r as i,pt as n,ut as r,mt as s,ht as t};
//# sourceMappingURL=styles-YY3p615I.js.map
