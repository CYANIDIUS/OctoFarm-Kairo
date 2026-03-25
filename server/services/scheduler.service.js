const Logger = require("../handlers/logger.js");
const { LOGGER_ROUTE_KEYS } = require("../constants/logger.constants");

const logger = new Logger(LOGGER_ROUTE_KEYS.SERVER_CORE);

const DEFAULT_BASE_SPEED = 60; // mm/s — baseline for time estimation

/**
 * Filters printers by compatibility with order requirements.
 * @param {Array} printers - Array of printer objects
 * @param {Object} requirements - Order requirements (volume, material, compatiblePrinters)
 * @returns {Array} Filtered array of compatible printers
 */
function filterCompatiblePrinters(printers, requirements) {
  return printers.filter((printer) => {
    const specs = printer.specifications || {};
    const bedSize = specs.bedSize || { x: 0, y: 0, z: 0 };
    const volume = requirements.volume || { x: 0, y: 0, z: 0 };

    // Check bed size fits the part volume (each axis)
    if (volume.x > 0 && bedSize.x > 0 && bedSize.x < volume.x) return false;
    if (volume.y > 0 && bedSize.y > 0 && bedSize.y < volume.y) return false;
    if (volume.z > 0 && bedSize.z > 0 && bedSize.z < volume.z) return false;

    // Check material compatibility
    const supportedMaterials = specs.supportedMaterials || [];
    if (
      requirements.material &&
      requirements.material.length > 0 &&
      supportedMaterials.length > 0 &&
      !supportedMaterials.includes(requirements.material)
    ) {
      return false;
    }

    // Check if printer is in the compatible printers list (if specified)
    const compatiblePrinters = requirements.compatiblePrinters || [];
    if (compatiblePrinters.length > 0) {
      const printerId = printer._id.toString();
      const isCompatible = compatiblePrinters.some(
        (cp) => cp.toString() === printerId
      );
      if (!isCompatible) return false;
    }

    return true;
  });
}

/**
 * Calculates the estimated time for a printer to complete a number of batches.
 * @param {Number} batches - Number of batches
 * @param {Number} estimatedPrintTime - Time per batch in seconds
 * @param {Number} printerSpeed - Printer speed in mm/s
 * @returns {Number} Estimated time in seconds
 */
function calculatePrinterTime(batches, estimatedPrintTime, printerSpeed) {
  const speed = printerSpeed > 0 ? printerSpeed : DEFAULT_BASE_SPEED;
  const speedFactor = speed / DEFAULT_BASE_SPEED;
  return Math.ceil(batches * estimatedPrintTime / speedFactor);
}

/**
 * min_time strategy: Greedy assignment — always assign next batch to the printer
 * that will finish earliest (minimizes total makespan).
 * @param {Number} totalBatches - Total batches to distribute
 * @param {Array} printers - Compatible printers
 * @param {Number} estimatedPrintTime - Time per batch in seconds
 * @returns {Array} Assignment objects
 */
function scheduleMinTime(totalBatches, printers, estimatedPrintTime) {
  if (printers.length === 0) return [];

  // Track current load (total time) for each printer
  const printerLoads = printers.map((p) => ({
    printer: p,
    batches: 0,
    currentTime: 0,
    speed: (p.specifications && p.specifications.printSpeed) || DEFAULT_BASE_SPEED,
  }));

  // Greedy: assign each batch to the printer that finishes earliest
  for (let i = 0; i < totalBatches; i++) {
    let minIdx = 0;
    let minFinish = Infinity;

    for (let j = 0; j < printerLoads.length; j++) {
      const pl = printerLoads[j];
      const speedFactor = pl.speed / DEFAULT_BASE_SPEED;
      const newFinish = pl.currentTime + estimatedPrintTime / speedFactor;
      if (newFinish < minFinish) {
        minFinish = newFinish;
        minIdx = j;
      }
    }

    printerLoads[minIdx].batches += 1;
    const speedFactor = printerLoads[minIdx].speed / DEFAULT_BASE_SPEED;
    printerLoads[minIdx].currentTime += estimatedPrintTime / speedFactor;
  }

  return printerLoads
    .filter((pl) => pl.batches > 0)
    .map((pl) => ({
      printerId: pl.printer._id,
      copies: pl.batches,
      estimatedTime: Math.ceil(pl.currentTime),
      status: "pending",
    }));
}

/**
 * min_idle strategy: Balanced load distribution — distribute batches as evenly
 * as possible across printers (minimizes idle time spread).
 * @param {Number} totalBatches - Total batches to distribute
 * @param {Array} printers - Compatible printers
 * @param {Number} estimatedPrintTime - Time per batch in seconds
 * @returns {Array} Assignment objects
 */
function scheduleMinIdle(totalBatches, printers, estimatedPrintTime) {
  if (printers.length === 0) return [];

  const printerCount = printers.length;
  const baseBatches = Math.floor(totalBatches / printerCount);
  let remainder = totalBatches % printerCount;

  return printers
    .map((p) => {
      let batches = baseBatches;
      if (remainder > 0) {
        batches += 1;
        remainder -= 1;
      }
      const speed =
        (p.specifications && p.specifications.printSpeed) || DEFAULT_BASE_SPEED;
      const estimatedTime = calculatePrinterTime(
        batches,
        estimatedPrintTime,
        speed
      );
      return {
        printerId: p._id,
        copies: batches,
        estimatedTime,
        status: "pending",
      };
    })
    .filter((a) => a.copies > 0);
}

/**
 * Main scheduling function.
 * Calculates an optimal assignment of print batches to printers.
 *
 * @param {Object} order - Order document (or plain object with order fields)
 * @param {Array} printers - Array of printer objects (Mongoose docs or plain objects)
 * @returns {Object} { assignments, totalBatches, totalEstimatedTime }
 */
function calculateSchedule(order, printers) {
  const totalBatches = Math.ceil(order.totalCopies / order.partsPerFile);
  const requirements = order.requirements || {};

  const compatible = filterCompatiblePrinters(printers, requirements);

  if (compatible.length === 0) {
    logger.warning("No compatible printers found for order: " + order.name);
    return {
      assignments: [],
      totalBatches,
      totalEstimatedTime: 0,
      error: "No compatible printers found",
    };
  }

  let assignments;
  if (order.optimizationMode === "min_idle") {
    assignments = scheduleMinIdle(
      totalBatches,
      compatible,
      order.estimatedPrintTime
    );
  } else {
    // Default: min_time
    assignments = scheduleMinTime(
      totalBatches,
      compatible,
      order.estimatedPrintTime
    );
  }

  const totalEstimatedTime =
    assignments.length > 0
      ? Math.max(...assignments.map((a) => a.estimatedTime))
      : 0;

  return {
    assignments,
    totalBatches,
    totalEstimatedTime,
  };
}

module.exports = {
  calculateSchedule,
  filterCompatiblePrinters,
  calculatePrinterTime,
  DEFAULT_BASE_SPEED,
};
