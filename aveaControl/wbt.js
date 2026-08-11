// ===============================
// Web Bluetooth Connection (Fixed)
// ===============================

// Only define characteristic once
var characteristic = null;

const color_service_uuid = "f815e810-456c-6761-746f-4d756e696368";
const color_characteristic_uuid = "f815e811-456c-6761-746f-4d756e696368";

async function findLamp() {
  try {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth is not supported in this browser. Use Chrome over HTTPS.");
      return;
    }

    console.log("Searching for Avea device...");

    // Use a more lenient filter to avoid missing devices
    const options = {
      acceptAllDevices: true,
      optionalServices: [color_service_uuid]
    };

    const device = await navigator.bluetooth.requestDevice(options);

    const server = await device.gatt.connect();

    const service = await server.getPrimaryService(color_service_uuid);

    characteristic = await service.getCharacteristic(color_characteristic_uuid);

    console.log("Connected to Avea lamp");

    // Subscribe to notifications from avea.js
    if (typeof subscribeToBulbNotifications === "function") {
      subscribeToBulbNotifications();
    }

    // Update UI
    const button = document.getElementById("connectbutton");
    if (button) {
      button.innerText = "Connected ✓";
      button.disabled = true;
    }

    const status = document.getElementById("connectionStatus");
    if (status) {
      status.innerText = "Connected";
      status.classList.remove("disconnected");
      status.classList.add("connected");
    }

    await sleep(500);
    if (typeof setBrightnessSliderValue === "function") {
      await setBrightnessSliderValue();
    }

    // Handle disconnect
    device.addEventListener("gattserverdisconnected", () => {
      console.log("Device disconnected");
      characteristic = null;

      if (button) {
        button.innerText = "Reconnect";
        button.disabled = false;
      }

      if (status) {
        status.innerText = "Disconnected";
        status.classList.remove("connected");
        status.classList.add("disconnected");
      }
    });

  } catch (error) {
    console.error("Bluetooth error:", error);
    alert("Connection failed: " + error.message);
  }
}

// Write data to characteristic safely
function writeCharacteristic(value) {
  if (!characteristic) {
    console.warn("No characteristic available to write");
    return;
  }

  try {
    characteristic.writeValue(Uint8Array.from(value));
  } catch (error) {
    console.error("Write failed:", error);
  }
}
