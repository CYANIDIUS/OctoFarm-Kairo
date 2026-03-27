/**
 * Orders page utility functions (rendering, formatting, etc.)
 */

/**
 * Format seconds to a human-readable time string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  if (!seconds || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h > 0) parts.push(h + "h");
  if (m > 0) parts.push(m + "m");
  if (s > 0 && h === 0) parts.push(s + "s");
  return parts.join(" ") || "0s";
}

/**
 * Get Bootstrap badge class for a given order status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeClass(status) {
  const map = {
    queued: "badge-secondary",
    calculated: "badge-primary",
    scheduled: "badge-warning",
    printing: "badge-success",
    done: "badge-light",
    canceled: "badge-danger",
  };
  return map[status] || "badge-secondary";
}

/**
 * Format a date string.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Get priority label.
 * @param {number} priority
 * @returns {string}
 */
export function getPriorityLabel(priority) {
  const map = {
    1: '<span class="badge badge-danger">1-Critical</span>',
    2: '<span class="badge badge-warning">2-High</span>',
    3: '<span class="badge badge-info">3-Normal</span>',
    4: '<span class="badge badge-secondary">4-Low</span>',
    5: '<span class="badge badge-dark">5-Background</span>',
  };
  return map[priority] || '<span class="badge badge-secondary">' + priority + "</span>";
}

/**
 * Get optimization mode label.
 * @param {string} mode
 * @returns {string}
 */
export function getOptModeLabel(mode) {
  if (mode === "min_time") return "Min Time";
  if (mode === "min_idle") return "Min Idle";
  return mode || "-";
}

/**
 * Build an order table row HTML.
 * @param {Object} order
 * @returns {string}
 */
export function buildOrderRow(order) {
  const isActionable = !["done", "canceled"].includes(order.status);
  const canCalculate = order.status === "queued";
  const canAssign = ["queued", "calculated"].includes(order.status);
  const canConfirm = order.status === "scheduled";
  const canDelete = !["printing"].includes(order.status);

  let actionsHtml = "";

  actionsHtml += `<button class="btn btn-sm btn-info btn-order-detail mr-1" data-id="${order._id}" title="View Details"><i class="fas fa-eye"></i></button>`;

  if (canCalculate) {
    actionsHtml += `<button class="btn btn-sm btn-primary btn-order-calculate mr-1" data-id="${order._id}" title="Calculate Schedule"><i class="fas fa-calculator"></i></button>`;
  }

  if (canAssign) {
    actionsHtml += `<button class="btn btn-sm btn-warning btn-order-assign mr-1" data-id="${order._id}" title="Assign Schedule"><i class="fas fa-check-double"></i></button>`;
  }

  if (canConfirm) {
    actionsHtml += `<button class="btn btn-sm btn-success btn-order-confirm mr-1" data-id="${order._id}" title="Confirm Print"><i class="fas fa-print"></i></button>`;
  }

  if (canDelete) {
    actionsHtml += `<button class="btn btn-sm btn-danger btn-order-delete" data-id="${order._id}" title="Delete Order"><i class="fas fa-trash"></i></button>`;
  }

  return `
    <tr data-order-id="${order._id}">
      <td>${getPriorityLabel(order.priority)}</td>
      <td>${escapeHtml(order.name)}</td>
      <td>${order.totalParts || ((order.fileCopies || order.totalCopies || 1) * (order.partsPerFile || 1))} pcs (${order.partsPerFile}/file × ${order.fileCopies || order.totalCopies || 1})</td>
      <td>${escapeHtml(order.requirements?.material || "Any")}</td>
      <td>${getOptModeLabel(order.optimizationMode)}</td>
      <td>${formatTime(order.totalEstimatedTime || order.estimatedPrintTime)}</td>
      <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${actionsHtml}</td>
    </tr>
  `;
}

/**
 * Build order detail HTML for the detail modal.
 * @param {Object} order
 * @returns {string}
 */
export function buildOrderDetailHtml(order) {
  let html = `
    <div class="row">
      <div class="col-md-6">
        <p><strong>Name:</strong> ${escapeHtml(order.name)}</p>
        <p><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></p>
        <p><strong>Priority:</strong> ${getPriorityLabel(order.priority)}</p>
        <p><strong>Comment:</strong> ${escapeHtml(order.comment || "-")}</p>
        <p><strong>File:</strong> ${escapeHtml(order.originalFileName || "-")}</p>
      </div>
      <div class="col-md-6">
        <p><strong>Parts in File:</strong> ${order.partsPerFile}</p>
        <p><strong>File Copies (print runs):</strong> ${order.fileCopies || order.totalCopies || 1}</p>
        <p><strong>Total Parts:</strong> <span class="text-warning">${order.totalParts || ((order.fileCopies || order.totalCopies || 1) * (order.partsPerFile || 1))} pcs</span></p>
        <p><strong>Est. Print Time (per run):</strong> ${formatTime(order.estimatedPrintTime)}</p>
        <p><strong>Total Est. Time:</strong> ${formatTime(order.totalEstimatedTime)}</p>
        <p><strong>Optimization:</strong> ${getOptModeLabel(order.optimizationMode)}</p>
      </div>
    </div>
    <hr class="border-secondary">
    <h6><i class="fas fa-cog"></i> Requirements</h6>
    <p><strong>Volume:</strong> ${order.requirements?.volume?.x || 0} x ${order.requirements?.volume?.y || 0} x ${order.requirements?.volume?.z || 0} mm</p>
    <p><strong>Material:</strong> ${escapeHtml(order.requirements?.material || "Any")}</p>
  `;

  if (order.assignments && order.assignments.length > 0) {
    html += `
      <hr class="border-secondary">
      <h6><i class="fas fa-tasks"></i> Assignments</h6>
      <div class="table-responsive">
        <table class="table table-dark table-sm table-striped">
          <thead><tr><th>Printer ID</th><th>Copies</th><th>Est. Time</th><th>Status</th><th>G-code</th></tr></thead>
          <tbody>
    `;
    order.assignments.forEach((a) => {
      const gcodeStatus = a.gcodeFilePath
        ? '<span class="text-success"><i class="fas fa-check"></i> Uploaded</span>'
        : `<button class="btn btn-xs btn-outline-info btn-upload-gcode" data-order-id="${order._id}" data-assignment-id="${a._id}"><i class="fas fa-upload"></i> Upload</button>`;
      html += `
        <tr>
          <td><small>${a.printerId}</small></td>
          <td>${a.copies}</td>
          <td>${formatTime(a.estimatedTime)}</td>
          <td><span class="badge ${getStatusBadgeClass(a.status)}">${a.status}</span></td>
          <td>${gcodeStatus}</td>
        </tr>
      `;
    });
    html += "</tbody></table></div>";
  }

  return html;
}

/**
 * Simple HTML escape for display safety.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
