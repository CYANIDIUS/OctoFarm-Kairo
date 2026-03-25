const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ensureAuthenticated } = require("../middleware/auth");
const Order = require("../models/Order.js");
const Printer = require("../models/Printer.js");
const { calculateSchedule } = require("../services/scheduler.service");

// Ensure uploads base directory exists
const uploadsBase = path.join(__dirname, "..", "uploads", "orders");
if (!fs.existsSync(uploadsBase)) {
  fs.mkdirSync(uploadsBase, { recursive: true });
}

// Multer configuration for order file uploads (3MF / G-code)
const orderFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // For new orders, use a temp dir; for existing orders, use orderId dir
    const orderId = req.params.id || "temp";
    const dir = path.join(uploadsBase, orderId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const orderFileFilter = function (req, file, cb) {
  const allowedExtensions = [".3mf", ".gcode", ".gco", ".g"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only 3MF and G-code files are allowed"), false);
  }
};

const uploadOrderFile = multer({
  storage: orderFileStorage,
  fileFilter: orderFileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Multer for gcode upload to specific assignment
const gcodeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const orderId = req.params.id;
    const dir = path.join(uploadsBase, orderId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "gcode-" + uniqueSuffix + ext);
  },
});

const uploadGcode = multer({
  storage: gcodeStorage,
  fileFilter: orderFileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// GET /api/orders — List all orders
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const filter = {};
    if (statusFilter) {
      filter.status = statusFilter;
    }
    const orders = await Order.find(filter).sort({ priority: 1, createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — Get single order
router.get("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — Create order (with optional file upload)
router.post(
  "/",
  ensureAuthenticated,
  uploadOrderFile.single("file"),
  async (req, res) => {
    try {
      const orderData = {
        name: req.body.name,
        comment: req.body.comment || "",
        totalCopies: parseInt(req.body.totalCopies) || 1,
        partsPerFile: parseInt(req.body.partsPerFile) || 1,
        priority: parseInt(req.body.priority) || 3,
        estimatedPrintTime: parseInt(req.body.estimatedPrintTime) || 0,
        optimizationMode: req.body.optimizationMode || "min_time",
        status: "queued",
      };

      // Parse requirements
      orderData.requirements = {
        volume: {
          x: parseFloat(req.body.volumeX) || 0,
          y: parseFloat(req.body.volumeY) || 0,
          z: parseFloat(req.body.volumeZ) || 0,
        },
        material: req.body.material || "",
        compatiblePrinters: [],
      };

      if (req.body.compatiblePrinters) {
        try {
          const printers =
            typeof req.body.compatiblePrinters === "string"
              ? JSON.parse(req.body.compatiblePrinters)
              : req.body.compatiblePrinters;
          if (Array.isArray(printers)) {
            orderData.requirements.compatiblePrinters = printers;
          }
        } catch (e) {
          // Ignore parse errors for compatible printers
        }
      }

      const order = new Order(orderData);
      await order.save();

      // If file was uploaded, move it to the order's directory
      if (req.file) {
        const orderDir = path.join(uploadsBase, order._id.toString());
        if (!fs.existsSync(orderDir)) {
          fs.mkdirSync(orderDir, { recursive: true });
        }

        const tempFilePath = req.file.path;
        const newFilePath = path.join(orderDir, req.file.filename);

        // Move from temp to order directory if needed
        if (tempFilePath !== newFilePath) {
          fs.renameSync(tempFilePath, newFilePath);
        }

        order.filePath = path.join("server", "uploads", "orders", order._id.toString(), req.file.filename);
        order.originalFileName = req.file.originalname;
        await order.save();

        // Clean up temp directory if it exists
        const tempDir = path.join(uploadsBase, "temp");
        if (fs.existsSync(tempDir)) {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }

      res.status(201).json({ order });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/orders/:id — Update order
router.put("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Only allow updates to orders that are not yet printing or done
    if (["printing", "done"].includes(order.status)) {
      return res
        .status(400)
        .json({ error: "Cannot update order in status: " + order.status });
    }

    const updateFields = [
      "name",
      "comment",
      "totalCopies",
      "partsPerFile",
      "priority",
      "estimatedPrintTime",
      "optimizationMode",
      "status",
    ];
    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        order[field] = req.body[field];
      }
    });

    // Update requirements if provided
    if (req.body.requirements) {
      order.requirements = {
        ...order.requirements.toObject(),
        ...req.body.requirements,
      };
    }

    // Handle individual volume fields
    if (req.body.volumeX !== undefined || req.body.volumeY !== undefined || req.body.volumeZ !== undefined) {
      order.requirements.volume = {
        x: parseFloat(req.body.volumeX) || order.requirements.volume.x,
        y: parseFloat(req.body.volumeY) || order.requirements.volume.y,
        z: parseFloat(req.body.volumeZ) || order.requirements.volume.z,
      };
    }

    if (req.body.material !== undefined) {
      order.requirements.material = req.body.material;
    }

    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id — Delete order
router.delete("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Remove uploaded files
    const orderDir = path.join(uploadsBase, order._id.toString());
    if (fs.existsSync(orderDir)) {
      fs.rmSync(orderDir, { recursive: true, force: true });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/calculate — Calculate schedule (does NOT save to DB)
router.post("/:id/calculate", ensureAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const printers = await Printer.find({});
    const result = calculateSchedule(order, printers);

    if (result.error) {
      return res.status(400).json({ error: result.error, result });
    }

    // Populate printer names for display
    const printerMap = {};
    printers.forEach((p) => {
      printerMap[p._id.toString()] = {
        name:
          (p.settingsAppearance && p.settingsAppearance.name) ||
          p.printerName ||
          p.printerURL ||
          "Unknown",
        _id: p._id,
      };
    });

    const assignmentsWithNames = result.assignments.map((a) => ({
      ...a,
      printerName: printerMap[a.printerId.toString()]
        ? printerMap[a.printerId.toString()].name
        : "Unknown",
    }));

    res.json({
      assignments: assignmentsWithNames,
      totalBatches: result.totalBatches,
      totalEstimatedTime: result.totalEstimatedTime,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/assign — Confirm and save assignments (status → scheduled)
router.post("/:id/assign", ensureAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!["queued", "calculated"].includes(order.status)) {
      return res
        .status(400)
        .json({ error: "Order cannot be assigned in status: " + order.status });
    }

    // Accept assignments from request body or calculate them
    let assignments;
    if (req.body.assignments && Array.isArray(req.body.assignments)) {
      assignments = req.body.assignments;
    } else {
      const printers = await Printer.find({});
      const result = calculateSchedule(order, printers);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      assignments = result.assignments;
      order.totalEstimatedTime = result.totalEstimatedTime;
    }

    order.assignments = assignments;
    order.status = "scheduled";

    if (!order.totalEstimatedTime && assignments.length > 0) {
      order.totalEstimatedTime = Math.max(
        ...assignments.map((a) => a.estimatedTime || 0)
      );
    }

    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/confirm-print — Confirm sending to print (status → printing)
router.post("/:id/confirm-print", ensureAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "scheduled") {
      return res
        .status(400)
        .json({
          error: "Order must be in 'scheduled' status to confirm print",
        });
    }

    order.status = "printing";
    order.assignments.forEach((assignment) => {
      if (assignment.status === "pending") {
        assignment.status = "confirmed";
      }
    });

    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/upload-gcode — Upload G-code for a specific assignment
router.post(
  "/:id/upload-gcode",
  ensureAuthenticated,
  uploadGcode.single("gcode"),
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const assignmentId = req.body.assignmentId;
      if (!assignmentId) {
        return res.status(400).json({ error: "assignmentId is required" });
      }

      const assignment = order.assignments.id(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      assignment.gcodeFilePath = path.join(
        "server",
        "uploads",
        "orders",
        order._id.toString(),
        req.file.filename
      );

      await order.save();
      res.json({ order, assignmentId, gcodeFilePath: assignment.gcodeFilePath });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
