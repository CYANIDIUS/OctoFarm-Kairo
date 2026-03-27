import {
  fetchOrders,
  fetchOrder,
  createOrder,
  deleteOrder,
  calculateSchedule,
  assignSchedule,
  confirmPrint,
  uploadGcode,
} from "../js/pages/orders/orders.api";
import {
  buildOrderRow,
  buildOrderDetailHtml,
  formatTime,
} from "../js/pages/orders/orders.utils";

// Current filter state
let currentStatusFilter = "";
// Current order ID for schedule assignment
let currentScheduleOrderId = null;
let currentScheduleAssignments = null;

/**
 * Load and render orders table.
 */
async function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");
  const loading = document.getElementById("ordersLoading");
  const empty = document.getElementById("ordersEmpty");

  if (loading) loading.style.display = "block";
  if (empty) empty.style.display = "none";

  try {
    const data = await fetchOrders(currentStatusFilter);
    const orders = data.orders || [];

    if (loading) loading.style.display = "none";

    if (orders.length === 0) {
      tbody.innerHTML = "";
      if (empty) empty.style.display = "block";
      return;
    }

    tbody.innerHTML = orders.map((o) => buildOrderRow(o)).join("");
    attachRowListeners();
  } catch (err) {
    if (loading) loading.style.display = "none";
    console.error("Failed to load orders:", err);
    tbody.innerHTML =
      '<tr><td colspan="9" class="text-center text-danger">Failed to load orders: ' +
      err.message +
      "</td></tr>";
  }
}

/**
 * Attach event listeners to action buttons in the table.
 */
function attachRowListeners() {
  // Detail buttons
  document.querySelectorAll(".btn-order-detail").forEach((btn) => {
    btn.addEventListener("click", handleOrderDetail);
  });

  // Calculate buttons
  document.querySelectorAll(".btn-order-calculate").forEach((btn) => {
    btn.addEventListener("click", handleCalculate);
  });

  // Assign buttons
  document.querySelectorAll(".btn-order-assign").forEach((btn) => {
    btn.addEventListener("click", handleAssign);
  });

  // Confirm print buttons
  document.querySelectorAll(".btn-order-confirm").forEach((btn) => {
    btn.addEventListener("click", handleConfirmPrint);
  });

  // Delete buttons
  document.querySelectorAll(".btn-order-delete").forEach((btn) => {
    btn.addEventListener("click", handleDelete);
  });
}

/**
 * Handle viewing order details.
 */
async function handleOrderDetail(e) {
  const id = e.currentTarget.dataset.id;
  try {
    const data = await fetchOrder(id);
    const order = data.order;
    document.getElementById("orderDetailBody").innerHTML = buildOrderDetailHtml(order);

    // Attach upload gcode listeners inside the detail modal
    document.querySelectorAll(".btn-upload-gcode").forEach((btn) => {
      btn.addEventListener("click", function () {
        const orderId = this.dataset.orderId;
        const assignmentId = this.dataset.assignmentId;
        document.getElementById("gcodeOrderId").value = orderId;
        document.getElementById("gcodeAssignmentId").value = assignmentId;
        $("#uploadGcodeModal").modal("show");
      });
    });

    $("#orderDetailModal").modal("show");
  } catch (err) {
    alert("Error loading order: " + err.message);
  }
}

/**
 * Handle schedule calculation.
 */
async function handleCalculate(e) {
  const id = e.currentTarget.dataset.id;
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const result = await calculateSchedule(id);
    currentScheduleOrderId = id;
    currentScheduleAssignments = result.assignments;

    // Populate modal
    document.getElementById("schedTotalBatches").textContent = result.totalBatches;
    document.getElementById("schedTotalTime").textContent = formatTime(result.totalEstimatedTime);

    const tbody = document.getElementById("scheduleResultBody");
    tbody.innerHTML = result.assignments
      .map(
        (a) => `
      <tr>
        <td>${a.printerName || a.printerId}</td>
        <td>${a.copies}</td>
        <td>${formatTime(a.estimatedTime)}</td>
        <td>${a.status}</td>
      </tr>
    `
      )
      .join("");

    $("#scheduleResultModal").modal("show");
  } catch (err) {
    alert("Calculation error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-calculator"></i>';
  }
}

/**
 * Handle direct assignment (without prior calculation view).
 */
async function handleAssign(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("Assign schedule to this order? This will auto-calculate and assign printers.")) {
    return;
  }

  try {
    await assignSchedule(id);
    await loadOrders();
  } catch (err) {
    alert("Assignment error: " + err.message);
  }
}

/**
 * Handle confirming print.
 */
async function handleConfirmPrint(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("Confirm sending this order to print?")) {
    return;
  }

  try {
    await confirmPrint(id);
    await loadOrders();
  } catch (err) {
    alert("Confirm print error: " + err.message);
  }
}

/**
 * Handle deleting an order.
 */
async function handleDelete(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("Are you sure you want to delete this order?")) {
    return;
  }

  try {
    await deleteOrder(id);
    await loadOrders();
  } catch (err) {
    alert("Delete error: " + err.message);
  }
}

/**
 * Initialize the page.
 */
/**
 * Update the "Total Parts" display in the create order form.
 */
function updateTotalParts() {
  const partsPerFile = parseInt(document.getElementById("orderPartsPerFile")?.value) || 1;
  const fileCopies = parseInt(document.getElementById("orderFileCopies")?.value) || 1;
  const totalParts = partsPerFile * fileCopies;
  const el = document.getElementById("orderTotalParts");
  if (el) el.value = totalParts + " pcs";
}

function init() {
  // Auto-calculate total parts when inputs change
  const partsInput = document.getElementById("orderPartsPerFile");
  const copiesInput = document.getElementById("orderFileCopies");
  if (partsInput) partsInput.addEventListener("input", updateTotalParts);
  if (copiesInput) copiesInput.addEventListener("input", updateTotalParts);
  updateTotalParts(); // initial calculation

  // Filter buttons
  document.querySelectorAll(".order-filter").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".order-filter").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentStatusFilter = this.dataset.status;
      loadOrders();
    });
  });

  // Create order form submit
  const btnSubmitOrder = document.getElementById("btnSubmitOrder");
  if (btnSubmitOrder) {
    btnSubmitOrder.addEventListener("click", async function () {
      const form = document.getElementById("createOrderForm");
      const formData = new FormData(form);

      // Validate required fields
      const name = formData.get("name");
      if (!name || name.trim() === "") {
        alert("Order name is required");
        return;
      }

      btnSubmitOrder.disabled = true;
      btnSubmitOrder.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

      try {
        await createOrder(formData);
        form.reset();
        $("#createOrderModal").modal("hide");
        await loadOrders();
      } catch (err) {
        alert("Error creating order: " + err.message);
      } finally {
        btnSubmitOrder.disabled = false;
        btnSubmitOrder.innerHTML = '<i class="fas fa-save"></i> Create Order';
      }
    });
  }

  // Assign schedule from modal
  const btnAssignSchedule = document.getElementById("btnAssignSchedule");
  if (btnAssignSchedule) {
    btnAssignSchedule.addEventListener("click", async function () {
      if (!currentScheduleOrderId || !currentScheduleAssignments) return;

      btnAssignSchedule.disabled = true;
      try {
        await assignSchedule(currentScheduleOrderId, currentScheduleAssignments);
        $("#scheduleResultModal").modal("hide");
        currentScheduleOrderId = null;
        currentScheduleAssignments = null;
        await loadOrders();
      } catch (err) {
        alert("Assignment error: " + err.message);
      } finally {
        btnAssignSchedule.disabled = false;
      }
    });
  }

  // Upload G-code submit
  const btnSubmitGcode = document.getElementById("btnSubmitGcode");
  if (btnSubmitGcode) {
    btnSubmitGcode.addEventListener("click", async function () {
      const orderId = document.getElementById("gcodeOrderId").value;
      const assignmentId = document.getElementById("gcodeAssignmentId").value;
      const fileInput = document.getElementById("gcodeFile");
      const file = fileInput.files[0];

      if (!file) {
        alert("Please select a G-code file");
        return;
      }

      btnSubmitGcode.disabled = true;
      btnSubmitGcode.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

      try {
        await uploadGcode(orderId, assignmentId, file);
        $("#uploadGcodeModal").modal("hide");
        fileInput.value = "";
        // Refresh detail if open
        const detailBody = document.getElementById("orderDetailBody");
        if (detailBody.innerHTML.trim() !== "") {
          const data = await fetchOrder(orderId);
          detailBody.innerHTML = buildOrderDetailHtml(data.order);
        }
      } catch (err) {
        alert("Upload error: " + err.message);
      } finally {
        btnSubmitGcode.disabled = false;
        btnSubmitGcode.innerHTML = '<i class="fas fa-upload"></i> Upload';
      }
    });
  }

  // Initial load
  loadOrders();
}

// Run initialization
init();
