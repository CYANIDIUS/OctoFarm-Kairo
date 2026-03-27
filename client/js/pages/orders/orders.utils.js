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
    1: '<span class="badge badge-danger">1-Критический</span>',
    2: '<span class="badge badge-warning">2-Высокий</span>',
    3: '<span class="badge badge-info">3-Обычный</span>',
    4: '<span class="badge badge-secondary">4-Низкий</span>',
    5: '<span class="badge badge-dark">5-Фоновый</span>',
  };
  return map[priority] || '<span class="badge badge-secondary">' + priority + "</span>";
}

/**
 * Get optimization mode label.
 * @param {string} mode
 * @returns {string}
 */
export function getOptModeLabel(mode) {
  if (mode === "min_time") return "Мин. время";
  if (mode === "min_idle") return "Баланс";
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

  actionsHtml += `<button class="btn btn-sm btn-info btn-order-detail mr-1" data-id="${order._id}" title="Детали"><i class="fas fa-eye"></i></button>`;

  if (canCalculate) {
    actionsHtml += `<button class="btn btn-sm btn-primary btn-order-calculate mr-1" data-id="${order._id}" title="Рассчитать"><i class="fas fa-calculator"></i></button>`;
  }

  if (canAssign) {
    actionsHtml += `<button class="btn btn-sm btn-warning btn-order-assign mr-1" data-id="${order._id}" title="Назначить"><i class="fas fa-check-double"></i></button>`;
  }

  if (canConfirm) {
    actionsHtml += `<button class="btn btn-sm btn-success btn-order-confirm mr-1" data-id="${order._id}" title="Подтвердить печать"><i class="fas fa-print"></i></button>`;
  }

  if (canDelete) {
    actionsHtml += `<button class="btn btn-sm btn-danger btn-order-delete" data-id="${order._id}" title="Удалить"><i class="fas fa-trash"></i></button>`;
  }

  return `
    <tr data-order-id="${order._id}">
      <td>${getPriorityLabel(order.priority)}</td>
      <td>${escapeHtml(order.name)}</td>
      <td>${order.totalParts || ((order.fileCopies || order.totalCopies || 1) * (order.partsPerFile || 1))} шт. (${order.partsPerFile}/file × ${order.fileCopies || order.totalCopies || 1})</td>
      <td>${escapeHtml(order.requirements?.material || "Любой")}</td>
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
 * Shows group-based assignments with G-code upload per group.
 * @param {Object} order
 * @returns {string}
 */
export function buildOrderDetailHtml(order) {
  let html = `
    <div class="row">
      <div class="col-md-6">
        <p><strong>Название:</strong> ${escapeHtml(order.name)}</p>
        <p><strong>Статус:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></p>
        <p><strong>Приоритет:</strong> ${getPriorityLabel(order.priority)}</p>
        <p><strong>Комментарий:</strong> ${escapeHtml(order.comment || "-")}</p>
        <p><strong>Файл:</strong> ${escapeHtml(order.originalFileName || "-")}</p>
      </div>
      <div class="col-md-6">
        <p><strong>Деталей в файле:</strong> ${order.partsPerFile}</p>
        <p><strong>Копий файла:</strong> ${order.fileCopies || order.totalCopies || 1}</p>
        <p><strong>Итого деталей:</strong> <span class="text-warning">${order.totalParts || ((order.fileCopies || order.totalCopies || 1) * (order.partsPerFile || 1))} шт.</span></p>
        <p><strong>Расч. время (на партию):</strong> ${formatTime(order.estimatedPrintTime)}</p>
        <p><strong>Общее расч. время:</strong> ${formatTime(order.totalEstimatedTime)}</p>
        <p><strong>Оптимизация:</strong> ${getOptModeLabel(order.optimizationMode)}</p>
      </div>
    </div>
    <hr class="border-secondary">
    <h6><i class="fas fa-cog"></i> Требования</h6>
    <p><strong>Размеры:</strong> ${order.requirements?.volume?.x || 0} x ${order.requirements?.volume?.y || 0} x ${order.requirements?.volume?.z || 0} mm</p>
    <p><strong>Материал:</strong> ${escapeHtml(order.requirements?.material || "Любой")}</p>
  `;

  if (order.assignments && order.assignments.length > 0) {
    html += `
      <hr class="border-secondary">
      <h6><i class="fas fa-tasks"></i> Назначения</h6>
      <div class="table-responsive">
        <table class="table table-dark table-sm table-striped">
          <thead><tr><th>Группа принтеров</th><th>Принтеры</th><th>Партий</th><th>На принтер</th><th>Расч. время</th><th>Статус</th><th>G-code</th></tr></thead>
          <tbody>
    `;
    order.assignments.forEach((a) => {
      const printerCount = a.printerIds ? a.printerIds.length : 0;
      const gcodeStatus = a.gcodeFilePath
        ? '<span class="text-success"><i class="fas fa-check"></i> Загружен</span>'
        : `<button class="btn btn-xs btn-outline-info btn-upload-gcode" data-order-id="${order._id}" data-assignment-id="${a._id}" data-group-label="${escapeHtml(a.groupLabel || "")}"><i class="fas fa-upload"></i> Загрузить</button>`;
      html += `
        <tr>
          <td>${escapeHtml(a.groupLabel || a.groupKey || "-")}</td>
          <td>${printerCount}</td>
          <td>${a.copies}</td>
          <td>${a.copiesPerPrinter || "-"}</td>
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
