// ===============================
// Elgato Avea Control Logic
// ===============================

var preset_off = [53, 244, 1, 10, 0, 0, 128, 0, 48, 0, 32, 0, 16];

var brigtnessCommandPrefix = "57";
var colorCommandPrefix = "3511010000";
var nameCommandPrefix = "58";

var bulbName;
var bulbBrightness;

var characteristic = null;

// ===============================
// UI Helpers
// ===============================

function updateBrightnessLabel(value) {
  const label = document.getElementById("brightnessValue");
  if (label) label.innerText = value;
}

function setStaticColor() {
  const colorHex = document.getElementById("staticColor").value;
  const color = hexToRgb(colorHex);

  // Update button preview color
  document.getElementById("setStaticColor").style.backgroundColor =
    `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

  setRGBnoW(color[0], color[1], color[2]);
}

function setBrightnessFromSlider() {
  const percentage = document.getElementById("brightnesSlider").value;
  setBrightnessByPercentage(percentage);
}

// ===============================
// Color + Brightness Commands
// ===============================

function setRGB(red, green, blue) {
  setColor(Math.min(red, green, blue), scaleValue(red), scaleValue(green), scaleValue(blue));
}

function setRGBnoW(red, green, blue) {
  setColor(0, scaleValue(red), scaleValue(green), scaleValue(blue));
}

function setARGB(white, red, green, blue) {
  setColor(scaleValue(white), scaleValue(red), scaleValue(green), scaleValue(blue));
}

function scaleValue(value) {
  return ((value + 1) * 16) - 1;
}

function setColor(white, red, green, blue) {
  const whiteHex = decimalNumberToLittleEndianHex(checkValueBounds(white) | 0x8000);
  const redHex = decimalNumberToLittleEndianHex(checkValueBounds(red) | 0x3000);
  const greenHex = decimalNumberToLittleEndianHex(checkValueBounds(green) | 0x2000);
  const blueHex = decimalNumberToLittleEndianHex(checkValueBounds(blue) | 0x1000);

  setHexValue(colorCommandPrefix + whiteHex + redHex + greenHex + blueHex);
}

function setBrightnessByPercentage(value) {
  setBrightness(Math.ceil(4095 * (value / 100)));
}

function setBrightness(value) {
  setHexValue(brigtnessCommandPrefix + decimalNumberToLittleEndianHex(checkValueBounds(value)));
}

function setOff() {
  setValue(preset_off);
}

// ===============================
// Device Communication
// ===============================

function subscribeToBulbNotifications() {
  if (!characteristic) return;

  characteristic.startNotifications().then(() => {
    console.log("Notifications started");
    characteristic.addEventListener("characteristicvaluechanged", handleNotifications);
  });

  setHexValue("0100");
}

async function getBrightness() {
  setHexValue(brigtnessCommandPrefix);
  await sleep(400);
  return bulbBrightness;
}

async function setBrightnessSliderValue() {
  const brightness = await getBrightness();
  if (brightness == null) return;

  const percentage = Math.ceil(((brightness + 1) / 4096) * 100);

  const slider = document.getElementById("brightnesSlider");
  if (slider) slider.value = percentage;

  updateBrightnessLabel(percentage);
}

function handleNotifications(event) {
  let value = event.target.value;
  let hex = [];

  for (let i = 0; i < value.byteLength; i++) {
    hex.push(value.getUint8(i).toString(16).padStart(2, "0"));
  }

  const commandString = hex.join("");
  const command = commandString.substring(0, 2);
  const rest = commandString.substring(2);

  switch (command) {
    case "57":
      bulbBrightness = parseInt(rest, 16);
      break;
    case "58":
      bulbName = hexToUtf8(rest.slice(0, -1));
      break;
    default:
      console.log("Unknown notification:", commandString);
  }
}

// ===============================
// Utilities
// ===============================

function hexToRgb(hex) {
  return hex
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
      (m, r, g, b) => "#" + r + r + g + g + b + b)
    .substring(1)
    .match(/.{2}/g)
    .map(x => parseInt(x, 16));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkValueBounds(value) {
  if (value < 0 || value > 4095) {
    throw new Error("Value out of bounds");
  }
  return value;
}

function decimalNumberToLittleEndianHex(number) {
  return changeEndianness(decimalHexTwosComplement(number));
}

function decimalHexTwosComplement(decimal) {
  let hex = decimal.toString(16).padStart(4, "0");
  return hex;
}

function changeEndianness(string) {
  return string.match(/.{2}/g).reverse().join("");
}

function hexToBytes(hex) {
  let bytes = [];
  for (let c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

function hexToUtf8(s) {
  return decodeURIComponent(
    s.replace(/\s+/g, "").replace(/[0-9a-f]{2}/g, "%$&")
  );
}

function setHexValue(value) {
  writeCharacteristic(hexToBytes(value));
}

function setValue(value) {
  writeCharacteristic(value);
}
