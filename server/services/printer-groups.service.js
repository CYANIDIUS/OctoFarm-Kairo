const Logger = require("../handlers/logger.js");
const { LOGGER_ROUTE_KEYS } = require("../constants/logger.constants");

const logger = new Logger(LOGGER_ROUTE_KEYS.SERVER_CORE);

/**
 * Generate a config key for grouping printers.
 * Printers with the same key use the same G-code.
 * Key format: "ModelName|nozzleDiameter|nozzleMaterial|filamentType"
 *
 * @param {Object} printer - Printer document
 * @returns {string} Config key
 */
function getConfigKey(printer) {
  const name =
    (printer.settingsAppearance && printer.settingsAppearance.name) ||
    printer.printerURL ||
    "unknown";
  const nozzle =
    (printer.specifications && printer.specifications.nozzleDiameter) || 0.4;
  const nozzleMat =
    (printer.specifications && printer.specifications.nozzleMaterial) ||
    "Brass";
  const filType = (printer.loadedFilament && printer.loadedFilament.type) || "";
  return `${name}|${nozzle}|${nozzleMat}|${filType}`;
}

/**
 * Get human-readable label for a group.
 * e.g. "Anycubic Kobra S1 Combo (0.4mm Brass, PLA)"
 *
 * @param {Object} group - Group object with key, printers array
 * @returns {string} Human-readable label
 */
function getGroupLabel(group) {
  if (!group || !group.printers || group.printers.length === 0) {
    return group ? group.key : "Unknown Group";
  }
  const ref = group.printers[0];
  const name =
    (ref.settingsAppearance && ref.settingsAppearance.name) ||
    ref.printerURL ||
    "Unknown";
  const nozzle =
    (ref.specifications && ref.specifications.nozzleDiameter) || 0.4;
  const nozzleMat =
    (ref.specifications && ref.specifications.nozzleMaterial) || "Brass";
  const filType = (ref.loadedFilament && ref.loadedFilament.type) || "";
  const filColor = (ref.loadedFilament && ref.loadedFilament.color) || "";

  let detail = `${nozzle}mm ${nozzleMat}`;
  if (filType) {
    detail += `, ${filType}`;
  }
  if (filColor) {
    detail += ` ${filColor}`;
  }
  return `${name} (${detail})`;
}

/**
 * Group printers by config key.
 * Returns a Map where each entry contains:
 *   { key, label, printers: [...], speed, printerCount }
 *
 * speed = single printer speed (from specifications.printSpeed)
 *
 * @param {Array} printers - Array of printer documents
 * @returns {Map<string, Object>} Map of config key → group info
 */
function groupPrinters(printers) {
  const groups = new Map();

  for (const printer of printers) {
    const key = getConfigKey(printer);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: "",
        printers: [],
        speed: 0,
        printerCount: 0,
      });
    }
    const group = groups.get(key);
    group.printers.push(printer);
    group.printerCount = group.printers.length;

    // Use the speed from the first printer (all printers in group have same model)
    const speed =
      (printer.specifications && printer.specifications.printSpeed) || 0;
    if (group.speed === 0 && speed > 0) {
      group.speed = speed;
    }
  }

  // Set labels after all printers are grouped
  for (const group of groups.values()) {
    group.label = getGroupLabel(group);
  }

  return groups;
}

module.exports = {
  getConfigKey,
  getGroupLabel,
  groupPrinters,
};
