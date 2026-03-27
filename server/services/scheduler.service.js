const Logger = require("../handlers/logger.js");
const { LOGGER_ROUTE_KEYS } = require("../constants/logger.constants");
const { groupPrinters } = require("./printer-groups.service");

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
 * Estimates print time for a given speed based on the reference time.
 *
 * @param {Number} batches - Number of batches for this printer/group
 * @param {Number} estimatedPrintTime - Time per batch in seconds (from slicer, for the reference printer)
 * @param {Number} printerSpeed - This printer/group's speed (mm/s)
 * @param {Number} referenceSpeed - Reference printer's speed (mm/s)
 * @returns {Number} Estimated time in seconds
 */
function calculatePrinterTime(batches, estimatedPrintTime, printerSpeed, referenceSpeed) {
  if (!printerSpeed || printerSpeed <= 0 || !referenceSpeed || referenceSpeed <= 0) {
    return Math.ceil(batches * estimatedPrintTime);
  }
  const scaleFactor = referenceSpeed / printerSpeed;
  return Math.ceil(batches * estimatedPrintTime * scaleFactor);
}

/**
 * Determines the reference speed — the speed of the fastest compatible printer.
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
 * Calculate wall time for a group assignment.
 * Within a group, printers print in parallel, so wall time = ceil(copies/printerCount) * timePerBatch.
 *
 * @param {Number} totalGroupCopies - Total batches assigned to this group
 * @param {Number} printerCount - Number of printers in the group
 * @param {Number} estimatedPrintTime - Time per batch (slicer time)
 * @param {Number} groupSpeed - Speed of printers in this group
 * @param {Number} referenceSpeed - Reference speed
 * @returns {Number} Wall time in seconds
 */
function calculateGroupWallTime(totalGroupCopies, printerCount, estimatedPrintTime, groupSpeed, referenceSpeed) {
  const copiesPerPrinter = Math.ceil(totalGroupCopies / printerCount);
  return calculatePrinterTime(copiesPerPrinter, estimatedPrintTime, groupSpeed, referenceSpeed);
}

/**
 * min_time strategy for groups: Greedy — assign next batch to the group
 * that will finish earliest (considering parallel printers within each group).
 *
 * @param {Number} totalBatches
 * @param {Array} groups - Array of group objects { key, label, printers, speed, printerCount }
 * @param {Number} estimatedPrintTime
 * @param {Number} referenceSpeed
 * @returns {Array} Group assignment objects
 */
function scheduleGroupsMinTime(totalBatches, groups, estimatedPrintTime, referenceSpeed) {
  if (groups.length === 0) return [];

  const groupLoads = groups.map((g) => ({
    group: g,
    copies: 0,
    currentWallTime: 0,
  }));

  for (let i = 0; i < totalBatches; i++) {
    let minIdx = 0;
    let minFinish = Infinity;

    for (let j = 0; j < groupLoads.length; j++) {
      const gl = groupLoads[j];
      // Wall time if we add one more batch to this group
      const newCopies = gl.copies + 1;
      const newWallTime = calculateGroupWallTime(
        newCopies,
        gl.group.printerCount,
        estimatedPrintTime,
        gl.group.speed,
        referenceSpeed
      );
      if (newWallTime < minFinish) {
        minFinish = newWallTime;
        minIdx = j;
      }
    }

    groupLoads[minIdx].copies += 1;
    groupLoads[minIdx].currentWallTime = minFinish;
  }

  return groupLoads
    .filter((gl) => gl.copies > 0)
    .map((gl) => ({
      groupKey: gl.group.key,
      groupLabel: gl.group.label,
      printerIds: gl.group.printers.map((p) => p._id),
      copies: gl.copies,
      copiesPerPrinter: Math.ceil(gl.copies / gl.group.printerCount),
      estimatedTime: Math.ceil(gl.currentWallTime),
      status: "pending",
      gcodeFilePath: null,
    }));
}

/**
 * min_idle strategy for groups: Balanced distribution across groups,
 * weighted by effective throughput (printerCount × speed).
 *
 * @param {Number} totalBatches
 * @param {Array} groups
 * @param {Number} estimatedPrintTime
 * @param {Number} referenceSpeed
 * @returns {Array} Group assignment objects
 */
function scheduleGroupsMinIdle(totalBatches, groups, estimatedPrintTime, referenceSpeed) {
  if (groups.length === 0) return [];

  // Weight each group by effective throughput = printerCount * speed
  const totalThroughput = groups.reduce((sum, g) => {
    const effectiveSpeed = (g.speed || referenceSpeed || 1) * g.printerCount;
    return sum + effectiveSpeed;
  }, 0);

  let remaining = totalBatches;
  const assignments = groups.map((g, idx) => {
    const effectiveSpeed = (g.speed || referenceSpeed || 1) * g.printerCount;
    let copies;
    if (idx === groups.length - 1) {
      copies = remaining; // last group gets the remainder
    } else {
      copies = Math.round((effectiveSpeed / totalThroughput) * totalBatches);
      copies = Math.min(copies, remaining);
    }
    remaining -= copies;

    const copiesPerPrinter = g.printerCount > 0 ? Math.ceil(copies / g.printerCount) : copies;
    const wallTime = calculateGroupWallTime(
      copies,
      g.printerCount,
      estimatedPrintTime,
      g.speed,
      referenceSpeed
    );

    return {
      groupKey: g.key,
      groupLabel: g.label,
      printerIds: g.printers.map((p) => p._id),
      copies,
      copiesPerPrinter,
      estimatedTime: Math.ceil(wallTime),
      status: "pending",
      gcodeFilePath: null,
    };
  });

  return assignments.filter((a) => a.copies > 0);
}

/**
 * Main scheduling function — group-based.
 * Groups compatible printers by config key, then distributes batches across groups.
 *
 * @param {Object} order - Order document
 * @param {Array} printers - Array of printer objects
 * @param {Object} [options] - Optional: { compatibleGroups: [groupKey, ...] }
 * @returns {Object} { assignments, totalBatches, totalEstimatedTime }
 */
function calculateSchedule(order, printers, options) {
  const fileCopies = order.fileCopies || order.totalCopies || 1;
  const totalBatches = fileCopies;
  const requirements = order.requirements || {};

  const compatible = filterCompatiblePrinters(printers, requirements);

  if (compatible.length === 0) {
    logger.warning("No compatible printers found for order: " + order.name);
    return {
      assignments: [],
      totalBatches,
      totalEstimatedTime: 0,
      error: "Совместимые принтеры не найдены",
    };
  }

  // Group compatible printers
  const allGroups = groupPrinters(compatible);

  // If specific groups were requested, filter to only those
  let selectedGroups;
  const compatibleGroupKeys = options && options.compatibleGroups;
  if (compatibleGroupKeys && compatibleGroupKeys.length > 0) {
    selectedGroups = [];
    for (const key of compatibleGroupKeys) {
      if (allGroups.has(key)) {
        selectedGroups.push(allGroups.get(key));
      }
    }
  } else {
    selectedGroups = Array.from(allGroups.values());
  }

  if (selectedGroups.length === 0) {
    logger.warning("No compatible printer groups found for order: " + order.name);
    return {
      assignments: [],
      totalBatches,
      totalEstimatedTime: 0,
      error: "Совместимые группы принтеров не найдены",
    };
  }

  const referenceSpeed = getReferenceSpeed(compatible);

  let assignments;
  if (order.optimizationMode === "min_idle") {
    assignments = scheduleGroupsMinIdle(
      totalBatches,
      selectedGroups,
      order.estimatedPrintTime,
      referenceSpeed
    );
  } else {
    assignments = scheduleGroupsMinTime(
      totalBatches,
      selectedGroups,
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
