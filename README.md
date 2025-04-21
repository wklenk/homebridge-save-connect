# homebridge-save-connect

> ⚠️ **Experimental Plugin**  
> This plugin is a **proof-of-concept** to explore integration of **Systemair SAVE CONNECT** ventilation devices into Homebridge and Apple Home.
>
> Its current main purpose is to allow **triggering short-term ventilation** ("Refresh" user mode) — for example, after detecting heavy steam buildup in a bathroom or shower room.
>
> More features may be added in the future.

---

A Homebridge plugin to integrate **SAVE CONNECT** devices into HomeKit.

This plugin automatically discovers SAVE CONNECT devices on the local network using DNS Service Discovery (Bonjour / mDNS).

---

## Features

- **Automatic discovery** of SAVE CONNECT devices (no manual configuration required)
- **Real-time monitoring** of the ventilation system's current user mode (Auto, Refresh)
- **HomeKit switch** to trigger **short-term ventilation** (Switch to user mode "Refresh")
- **Siri voice control** supported
- **Regular state synchronization** with the device (default every 15 seconds)

---

## Installation

Install through Homebridge Config UI X, or manually:

```bash
sudo npm install -g homebridge-save-connect
```

## Configuration

The IP address of the **SAVE CONNECT** device is discovered automatically on the local network.

You need to have the following section in your Homebridge config file:

```json
{
    "bridge": {
        ...
    },
    "accessories": [],
    "platforms": [
        {
            ...
        },
        {
            "platform": "SaveConnectPlatform"
        }
    ]
}
```

## Supported ventilation systems

This plugin was developed for and tested for a **Systemair SAVE VSR 300** ventilation system
with a **SAVE CONNECT** module attached.
