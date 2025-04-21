import type { API } from 'homebridge';

import { SaveConnectPlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(
    'homebridge-save-connect',
    PLATFORM_NAME,
    SaveConnectPlatform,
  );
};
