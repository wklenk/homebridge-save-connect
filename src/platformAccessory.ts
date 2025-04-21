import type {
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import type { SaveConnectPlatform, SaveConnectDevice } from './platform.js';

// Modbus registers.
// For unknown reasons, they are off by -1 from what is documented in the SAVE Modbus variable list.
const REG_USERMODE_REFRESH_TIME = 1103; // Duration setting for user mode "Refresh" (in minutes).
const REG_USERMODE_CROWDED_TIME = 1104; // Duration setting for user mode Crowded (in hours).
const REG_USERMODE_MODE = 1160; // Active user mode.
const REG_USERMODE_HMI_CHANGE_REQUEST = 1161; // Activation of requested user mode.
const REG_USERMODE_MANUAL_AIRFLOW_LEVEL_SAF = 1130; // Fan speed level for user mode "Manual".
const REG_TC_SP = 2000; // User temperature set point.
const REG_ECO_MODE_ON_OFF = 2504; // ECO mode configuration status.
const REG_16101 = 16100; // Unknown register.

// Other constant values.
const REFRESH_TIME_MINUTES = 5; // Duration of the refresh mode in minutes.
const CROWDED_TIME_HOURS = 1; // Duration of the crowded mode in hours.
const USER_MODE_REQUEST_AUTO = 1; // For requesting user mode "Auto".
const USER_MODE_REQUEST_CROWDED = 3; // For requesting user mode "Crowded".
const USER_MODE_REQUEST_REFRESH = 4; // For requesting user mode "Refresh".
const ACTIVE_USER_MODE_CROWDED = 2; // Active user mode "Crowded".
const ACTIVE_USER_MODE_REFRESH = 3; // Active user mode "Refresh".

interface ReadResponse {
  '1160': number;
}

/**
 * SaveConnect Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SaveConnectPlatformAccessory {
  private pollInterval?: NodeJS.Timeout;

  private refreshService: Service;
  private crowdedService: Service;

  constructor(
    private readonly platform: SaveConnectPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Default-Manufacturer',
      )
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        'Default-Serial',
      );

    // Use the existing Switch service to change the ventilation user mode to "Refresh" for 5 minutes.
    this.refreshService =
      this.accessory.getService('Refresh') ||
      this.accessory.addService(
        this.platform.Service.Switch,
        'Refresh',
        'Refresh',
      );

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.refreshService.setCharacteristic(
      this.platform.Characteristic.Name,
      'Refresh (5 minutes)', // Same display name as the service
    );

    this.refreshService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.handleRefresh.bind(this));

    // Use the existing Switch service to change the ventilation user mode to "Crowded" for 1 hour.
    this.crowdedService =
      this.accessory.getService('Crowded') ||
      this.accessory.addService(
        this.platform.Service.Switch,
        'Crowded',
        'Crowded',
      );

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.crowdedService.setCharacteristic(
      this.platform.Characteristic.Name,
      'Crowded (1 hour)', // Same display name as the service',
    );

    this.crowdedService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.handleCrowded.bind(this));

    // Periodically update the switch state with the user mode state from the device.
    this.startPollingUserMode();
  }

  private async handleRefresh(value: CharacteristicValue) {
    const isOn = value as boolean;
    this.platform.log.info('Refresh switch was set to: ', isOn);

    if (isOn) {
      // Turn on user mode "Refresh" for 5 minutes.
      const payloadUserModeRefreshTime = `{
        "${REG_USERMODE_REFRESH_TIME}":${REFRESH_TIME_MINUTES}
      }`.replace(/\s/g, ''); // removes all spaces and line breaks;
      await this.sendWriteRequest(payloadUserModeRefreshTime);

      const payload = `{
        "${REG_USERMODE_MANUAL_AIRFLOW_LEVEL_SAF}":0,
        "${REG_USERMODE_HMI_CHANGE_REQUEST}":${USER_MODE_REQUEST_REFRESH},
        "${REG_TC_SP}":180,
        "${REG_ECO_MODE_ON_OFF}":0,
        "${REG_16101}":0
      }`.replace(/\s/g, ''); // removes all spaces and line breaks;
      await this.sendWriteRequest(payload);
    } else {
      // Turn off user mode "Refresh" by switching to user mode "Auto".
      const payload = `{
        "${REG_USERMODE_MANUAL_AIRFLOW_LEVEL_SAF}":0,
        "${REG_USERMODE_HMI_CHANGE_REQUEST}":${USER_MODE_REQUEST_AUTO},
        "${REG_TC_SP}":180,
        "${REG_ECO_MODE_ON_OFF}":0,
        "${REG_16101}":0
      }`.replace(/\s/g, ''); // removes all spaces and line breaks;
      await this.sendWriteRequest(payload);
    }
  }

  private async handleCrowded(value: CharacteristicValue) {
    const isOn = value as boolean;
    this.platform.log.info('Crowded switch was set to: ', isOn);

    if (isOn) {
      // Turn on user mode "Crowded" for 1 hour.
      const payloadUserModeRefreshTime = `{
        "${REG_USERMODE_CROWDED_TIME}":${CROWDED_TIME_HOURS}
      }`.replace(/\s/g, ''); // removes all spaces and line breaks;
      await this.sendWriteRequest(payloadUserModeRefreshTime);

      const payload = `{
        "${REG_USERMODE_MANUAL_AIRFLOW_LEVEL_SAF}":0,
        "${REG_USERMODE_HMI_CHANGE_REQUEST}":${USER_MODE_REQUEST_CROWDED},
        "${REG_TC_SP}":180,
        "${REG_ECO_MODE_ON_OFF}":0,
        "${REG_16101}":0
      }`.replace(/\s/g, ''); // removes all spaces and line breaks;
      await this.sendWriteRequest(payload);
    } else {
      // Turn off user mode "Crowded" by switching to user mode "Auto".
      const payload = `{
        "${REG_USERMODE_MANUAL_AIRFLOW_LEVEL_SAF}":0,
        "${REG_USERMODE_HMI_CHANGE_REQUEST}":${USER_MODE_REQUEST_AUTO},
        "${REG_TC_SP}":180,
        "${REG_ECO_MODE_ON_OFF}":0,
        "${REG_16101}":0
      }`.replace(/\s/g, ''); // removes all spaces and line breaks;
      await this.sendWriteRequest(payload);
    }
  }

  private startPollingUserMode() {
    this.pollInterval = setInterval(async () => {
      try {
        const payload = `{
          "${REG_USERMODE_MODE}":1
        }`.replace(/\s/g, ''); // removes all spaces and line breaks;
        const response: ReadResponse = await this.sendReadRequest(payload);

        const currentUserMode = response[REG_USERMODE_MODE];
        const isRefreshUserMode = currentUserMode === ACTIVE_USER_MODE_REFRESH;
        const isCrowdedUserMode = currentUserMode === ACTIVE_USER_MODE_CROWDED;

        this.platform.log.debug('Fetched current mode:', currentUserMode);

        this.refreshService.updateCharacteristic(
          this.platform.Characteristic.On,
          isRefreshUserMode,
        );

        this.crowdedService.updateCharacteristic(
          this.platform.Characteristic.On,
          isCrowdedUserMode,
        );
      } catch (error) {
        this.platform.log.error('Polling error:', error);
      }
    }, 30000); // every 30 seconds
  }

  private async sendWriteRequest(payload: string) {
    const device: SaveConnectDevice = this.accessory.context.device;
    const url = `http://${device.host}/mwrite?${encodeURIComponent(payload)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      this.platform.log.error(
        `HTTP error! status: ${response.status} for ${url}`,
      );
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    } else {
      this.platform.log.info(`GET ${url} response: ${response.status}`);
    }
  }

  private async sendReadRequest(payload: string): Promise<ReadResponse> {
    const device: SaveConnectDevice = this.accessory.context.device;
    const url = `http://${device.host}/mread?${encodeURIComponent(payload)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      this.platform.log.error(
        `HTTP error! status: ${response.status} for ${url}`,
      );
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    } else {
      this.platform.log.info(`GET ${url} response: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }
}
