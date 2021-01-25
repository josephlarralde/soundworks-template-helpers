import { LitElement, html, css } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map.js';
import './sw-app-header.js';

class SwPluginAuth extends LitElement {
  static get properties() {
    return {
      title: {
        type: String,
        reflect: true,
      },
      subtitle: {
        type: String,
        reflect: true,
      },
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .half-screen {
        height: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .login-container {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .login-container, input, button {
        font-size: 2rem;
      }

      input {
        margin: 1rem 0;
      }
    `;
  }

  constructor() {
    super();
    this.title = '';
    this.subtitle = '';
  }

  render() {
    return html`
      <section class="half-screen">
        <sw-app-header title="${this.title}" subtitle="${this.subtitle}" />
      </section>
      <section class="half-screen">
        <div class="login-container">
          <div>
            Please enter password
          </div>
          <div>
            <input id="password" type="password" />
          </div>
          <div>
            <button @click="${this.sendPassword}"> OK </button>
          </div>
        </div>
      </section>
    `;
  }

  sendPassword() {
    const $password = this.shadowRoot.querySelector('#password');
    const password = $password.value;
    $password.value = '';
    const event = new CustomEvent('send', { detail: { password }});
    this.dispatchEvent(event);
  }
}

customElements.define('sw-plugin-auth', SwPluginAuth);
