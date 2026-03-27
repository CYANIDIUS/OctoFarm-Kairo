const Logger = require("../handlers/logger.js");
const { LOGGER_ROUTE_KEYS } = require("../constants/logger.constants");

const logger = new Logger(LOGGER_ROUTE_KEYS.SERVER_CORE);

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
 * Estimates print time for a given printer based on the reference time.
 *
 * The operator enters estimatedPrintTime from the slicer — this is the real
 * time for the REFERENCE printer (the one the G-code was sliced for).
 * For other printers, we scale proportionally by print speed.
 *
 * If the reference printer has speed R and another printer has speed P:
 *   adjustedTime = estimatedPrintTime * (R / P)
 *
 * If speeds are unknown (0), we assume the same time (no scaling).
 *
 * @param {Number} batches - Number of batches for this printer
 * @param {Number} estimatedPrintTime - Time per batch in seconds (from slicer, for the reference printer)
 * @param {Number} printerSpeed - This printer's speed (mm/s)
 * @param {Number} referenceSpeed - Reference printer's speed (mm/s), i.e. the fastest compatible or user-specified
 * @returns {Number} Estimated time in seconds
 */
function calculatePrinterTime(batches, estimatedPrintTime, printerSpeed, referenceSpeed) {
  // If either speed is unknown, no scaling — use raw time
  if (!printerSpeed || printerSpeed <= 0 || !referenceSpeed || referenceSpeed <= 0) {
    return Math.ceil(batches * estimatedPrintTime);
  }
  // Scale: if this printer is slower than reference, time increases proportionally
  const scaleFactor = referenceSpeed / printerSpeed;
  return Math.ceil(batches * estimatedPrintTime * scaleFactor);
}

/**
 * Determines the reference speed — the speed of the fastest compatible printer.
 * The assumption is that the operator sliced the G-code for the fastest printer
 * in the fleet (or at least, the estimatedPrintTime corresponds to that speed).
 *
 * @param {Array} printers - Compatible printers
 * @returns {Number} Reference speed in mm/s
 */
function getReferenceSpeed(printers) {
  let maxSpeed = 0;
  for (const p of printers) {
    const speed = (p.specifications && p.specifications.printSpeed) || 0;
    if (speed > maxSpeed) maxSpeed = speed;
  }
  return maxSpeed;
}

/**
 * min_time strategy: Greedy assignment — always assign next batch to the printer
 * that will finish earliest (minimizes total makespan).
 *
 * @param {Number} totalBatches - Total batches to distribute
 * @param {Array} printers - Compatible printers
 * @param {Number} estimatedPrintTime - Time per batch in seconds (from slicer)
 * @param {Number} referenceSpeed - Speed of the printer the time was estimated for
 * @returns {Array} Assignment objects
 */
function scheduleMinTime(totalBatches, printers, estimatedPrintTime, referenceSpeed) {
  if (printers.length === 0) return [];

  // Track current load (total time) for each printer
  const printerLoads = printers.map((p) => ({
    printer: p,
    batches: 0,
    currentTime: 0,
    speed: (p.specifications && p.specifications.printSpeed) || 0,
  }));

  // Greedy: assign each batch to the printer that finishes earliest
  for (let i = 0; i < totalBatches; i++) {
    let minIdx = 0;
    let minFinish = Infinity;

    for (let j = 0; j < printerLoads.length; j++) {
      const pl = printerLoads[j];
      // Time for one more batch on this printer
      const batchTime = calculatePrinterTime(1, estimatedPrintTime, pl.speed, referenceSpeed);
      const newFinish = pl.currentTime + batchTime;
      if (newFinish < minFinish) {
        minFinish = newFinish;
        minIdx = j;
      }
    }

    const pl = printerLoads[minIdx];
    pl.batches += 1;
    const batchTime = calculatePrinterTime(1, estimatedPrintTime, pl.speed, referenceSpeed);
    pl.currentTime += batchTime;
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
 *
 * @param {Number} totalBatches - Total batches to distribute
 * @param {Array} printers - Compatible printers
 * @param {Number} estimatedPrintTime - Time per batch in seconds (from slicer)
 * @param {Number} referenceSpeed - Speed of the printer the time was estimated for
 * @returns {Array} Assignment objects
 */
function scheduleMinIdle(totalBatches, printers, estimatedPrintTime, referenceSpeed) {
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
      const speed = (p.specifications && p.specifications.printSpeed) || 0;
      const estimatedTime = calculatePrinterTime(
        batches,
        estimatedPrintTime,
        speed,
        referenceSpeed
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
 * The estimatedPrintTime is treated as the real slicer time for the fastest
 * compatible printer. For slower printers, time is scaled proportionally.
 *
 * @param {Object} order - Order document
 * @param {Array} printers - Array of printer objects
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

  // Reference speed = fastest compatible printer's speed
  // (assumption: slicer time was calculated for this speed)
  const referenceSpeed = getReferenceSpeed(compatible);

  let assignments;
  if (order.optimizationMode === "min_idle") {
    assignments = scheduleMinIdle(
      totalBatches,
      compatible,
      order.estimatedPrintTime,
      referenceSpeed
    );
  } else {
    // Default: min_time
    assignments = scheduleMinTime(
      totalBatches,
      compatible,
      order.estimatedPrintTime,
      referenceSpeed
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
  getReferenceSpeed,
};
