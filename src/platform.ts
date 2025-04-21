import {
  Categories,
  type API,
  type Characteristic,
  type DynamicPlatformPlugin,
  type Logging,
  type PlatformAccessory,
  type PlatformConfig,
  type Service,
} from 'homebridge';

import { SaveConnectPlatformAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

import { Browser, Service as DNSSDService } from 'dnssd';

export interface SaveConnectDevice {
  id: string; // unique identifier (for UUID generation)
  displayName: string; // display name for HomeKit
  host: string; // IP address or hostname of the device
}

/**
 * SaveConnectPlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class SaveConnectPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.info('SaveConnectPlatform constructor called.');

    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      const ipAddresses = await this.discoverDevices();
      this.setupAccessories(ipAddresses);
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * Use DNS-SD to discover SAVE CONNECT devices on the local network. This is more convenient than
   * manually entering IP addresses in the config.json file.
   * This method will discover devices for 5 seconds and return an array of IP addresses.
   *
   * @returns {Promise<string[]>} - A promise that resolves to an array of IP addresses of discovered devices.
   */
  async discoverDevices(): Promise<string[]> {
    this.log.info('Discovering SAVE CONNECT devices for 5 seconds ...');
    return new Promise((resolve, reject) => {
      const ipAddresses: string[] = [];
      const browser = new Browser('_http._tcp');

      browser.on('serviceUp', (service: DNSSDService) => {
        const serviceName = service.name.toLowerCase();
        if (serviceName.includes('saveconnect')) {
          this.log.info(
            `Discovered SAVE CONNECT device: ${service.addresses} ${service.host}`,
          );
          ipAddresses.push(service.addresses[0]);
        }
      });

      browser.on('error', (error: Error) => {
        this.log.error(
          'Discovery of SAVE CONNECT devices failed with error:',
          error.message,
        );
        browser.stop();
        reject(error);
      });

      browser.start();

      setTimeout(() => {
        this.log.info('Discovery of SAVE CONNECT devices finished.');
        browser.stop();

        resolve(ipAddresses);
      }, 5000);
    });
  }

  /**
   * Register discovered SAVE CONNECT devices as accessories.
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async setupAccessories(ipAddresses: string[]) {
    // loop over the discovered devices and register each one if it has not already been registered
    for (const ipAddress of ipAddresses) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(`saveconnect-${ipAddress}`);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info(
          'Restoring existing accessory from cache:',
          existingAccessory.displayName,
        );

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new SaveConnectPlatformAccessory(this, existingAccessory);
      } else {
        // the accessory does not yet exist, so we need to create it
        const device: SaveConnectDevice = {
          id: uuid,
          displayName: `saveconnect-${ipAddress}`,
          host: ipAddress,
        };

        this.log.info(`Adding new SAVE CONNECT device: ${device.displayName}`);

        // create a new accessory
        const accessory = new this.api.platformAccessory(
          device.displayName,
          uuid,
          Categories.FAN,
        );

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new SaveConnectPlatformAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }

      // push into discoveredCacheUUIDs
      this.discoveredCacheUUIDs.push(uuid);
    }

    // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
    // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
    // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info(
          'Removing existing SAVE CONNECT device from cache:',
          accessory.displayName,
        );
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    }
  }
}
