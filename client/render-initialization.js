import { html, render } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import './components/sw-app-header.js';
import './components/sw-plugin-position.js';
import './components/sw-plugin-platform.js';
import './components/sw-plugin-default.js';
import './components/sw-plugin-error.js';

const startedMsg = {
  'audio-buffer-loader': (service) => 'Loading audio files',
  'sync': (service) => 'Syncing',
  'default': (service) => `Initializing ${service.name}`,
};

const errorMsg = {
  platform(service) {
    const serviceState = service.state.getValues();

    const stepErrors = {
      available: 'checking device compatibility',
      authorized: 'asking authorizations',
      initialized: 'initializing application',
      finalized: 'finalizing initialization',
    };

    // for testing...
    // serviceState['finalized'].result = false;
    // serviceState['finalized'].details['web-audio'] = false;

    let errorMsg;
    let erroredFeatures = [];

    // set error message and find more informations in [step].details
    for (let step of Object.keys(stepErrors)) {
      if (serviceState[step].result === false) { // this is the guilty one
        errorMsg = stepErrors[step];

        for (let feature in serviceState[step].details) {
          if (serviceState[step].details[feature] === false) {
            erroredFeatures.push(feature);
          }
        }

        break;
      }
    }

    return html`
      <li slot="message">An error occured while...</li>
      <li slot="description">${errorMsg} (${erroredFeatures.join(', ')})</li>
    `;
  },

  checkin(checkin) {
    return html`
      <li slot="message">No place available...</li>
      <li slot="description">Please try again later</li>
    `;

    return $html;
  },

  default(service) {
    return html`
      <li slot="message">An error occured while...</li>
      <li slot="description">Initializing ${service.name}</li>
    `;
  },
};


// this one is very special
const renderScreen = {
  platform(platform, config, containerInfos) {
    const serviceState = platform.state.getValues();

    let msg;
    let bindListener = undefined;
    let blink = false;

    if (serviceState.available === null) {
      msg = 'Checkin...';
    } else if (serviceState.authorized === null) {
      msg = 'Authorizing...';
    } else if (serviceState.initialized === null) {
      msg = 'Please click to join';
      blink = true;

      bindListener = (e) => {
        e.preventDefault();
        platform.onUserGesture(e);
      }
    } else if (serviceState.finalized === null) {
      msg = 'Finalizing...'
    }

    return html`
      <sw-plugin-platform
        title="${config.app.name}"
        subtitle="${config.app.author}"
        msg="${msg}"
        ?blink="${blink}"
        @touchend="${ifDefined(bindListener)}"
        @mouseup="${ifDefined(bindListener)}"
      />
    `;
  },

  position(position, config, containerInfos) {
    const { xRange, yRange } = position.options;

    const callback = (e) => {
      const { x, y } = e.detail;
      position.setPosition(x, y);
    };

    return html`
      <div class="screen">
        <sw-service-position
          x-range="${JSON.stringify(xRange)}"
          y-range="${JSON.stringify(yRange)}"
          @change="${callback}"
          width="${containerInfos.width}"
          height="${containerInfos.height}"
        />
      </div>
    `;
  },

  default(services, config, containerInfos) {
    return html`
      <sw-plugin-default
        title="${config.app.name}"
        subtitle="${config.app.author}"
      >
        ${services.map(service => html`
          <li>
            ${startedMsg[service.name]
              ? startedMsg[service.name](service)
              : startedMsg.default(service)}
          </li>`
        )}
      </sw-plugin-default>
    `;
  },

  errored(service, config, containerInfos) {
    return html`
      <sw-plugin-error
        title="${config.app.name}"
        subtitle="${config.app.author}"
      >
        ${errorMsg[service.name] ? errorMsg[service.name](service) : errorMsg.default(service)}
      </sw-plugin-error>
    `;
  },
};

/**
 * This method only works with default service names (cf. `serviceFactory.defaultName`).
 * if other names are used, should be updated accordingly...
 */
export default function renderInitialization(client, config, $container) {
  const unsubscribe = client.serviceManager.observe(status => {
    const { width, height } = $container.getBoundingClientRect();

    // for testing...
    // if (status['platform'] === 'ready') {
    //   status['platform'] = 'errored';
    // }

    let $screen;
    // handle platform first
    if (status['platform'] && status['platform'] === 'started') {

      const platformService = client.serviceManager.get('platform');
      $screen = renderScreen.platform(platformService, config, { width, height });

    } else if (status['platform'] && status['platform'] === 'errored') {

      const platformService = client.serviceManager.get('platform');
      $screen = renderScreen.errored(platformService, config, { width, height });

    // then every one else...
    } else if (status['position'] && status['position'] === 'started') {

      const positionService = client.serviceManager.get('position');
      $screen = renderScreen.position(positionService, config, { width, height });

    } else {
      // platform is ready, or not platform at all...
      const started = [];
      let errored = null; // only one service can be errored at once (normally)

      for (let key in status) {
        const service = client.serviceManager.get(key);

        // we ignore ready and idle services
        if (status[key] === 'started') {
          started.push(service);
        } else if (status[key] === 'errored') {
          errored = service;
        }
      }

      if (errored) {
        $screen = renderScreen.errored(errored, config, { width, height });
      } else {
        $screen = renderScreen.default(started, config, { width, height });
      }
    }

    render($screen, $container);
  });

  // clean when ready...
  client.serviceManager.ready.then(unsubscribe);
}

