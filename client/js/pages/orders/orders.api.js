/**
 * Orders API client module
 */

const ORDERS_API_BASE = "/api/orders";

/**
 * Fetch all orders, optionally filtered by status.
 * @param {string} [status] - Filter by order status
 * @returns {Promise<Object>}
 */
export async function fetchOrders(status) {
  const url = status ? `${ORDERS_API_BASE}?status=${status}` : ORDERS_API_BASE;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch orders");
  return response.json();
}

/**
 * Fetch a single order by ID.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function fetchOrder(id) {
  const response = await fetch(`${ORDERS_API_BASE}/${id}`);
  if (!response.ok) throw new Error("Failed to fetch order");
  return response.json();
}

/**
 * Create a new order. Uses FormData for file upload support.
 * @param {FormData} formData
 * @returns {Promise<Object>}
 */
export async function createOrder(formData) {
  const response = await fetch(ORDERS_API_BASE, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to create order");
  }
  return response.json();
}

/**
 * Update an order.
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateOrder(id, data) {
  const response = await fetch(`${ORDERS_API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to update order");
  }
  return response.json();
}

/**
 * Delete an order.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteOrder(id) {
  const response = await fetch(`${ORDERS_API_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to delete order");
  }
  return response.json();
}

/**
 * Calculate schedule for an order (preview, not saved).
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function calculateSchedule(id) {
  const response = await fetch(`${ORDERS_API_BASE}/${id}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to calculate schedule");
  }
  return response.json();
}

/**
 * Assign schedule to an order (saves assignments, status → scheduled).
 * @param {string} id
 * @param {Array} [assignments] - Optional pre-calculated assignments
 * @returns {Promise<Object>}
 */
export async function assignSchedule(id, assignments) {
  const body = assignments ? { assignments } : {};
  const response = await fetch(`${ORDERS_API_BASE}/${id}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to assign schedule");
  }
  return response.json();
}

/**
 * Confirm an order for printing (status → printing).
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function confirmPrint(id) {
  const response = await fetch(`${ORDERS_API_BASE}/${id}/confirm-print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to confirm print");
  }
  return response.json();
}

/**
 * Upload G-code for a specific assignment.
 * @param {string} orderId
 * @param {string} assignmentId
 * @param {File} gcodeFile
 * @returns {Promise<Object>}
 */
export async function uploadGcode(orderId, assignmentId, gcodeFile) {
  const formData = new FormData();
  formData.append("gcode", gcodeFile);
  formData.append("assignmentId", assignmentId);

  const response = await fetch(`${ORDERS_API_BASE}/${orderId}/upload-gcode`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to upload G-code");
  }
  return response.json();
}
