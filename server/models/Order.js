const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema(
  {
    printerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Printer",
      required: true,
    },
    copies: {
      type: Number,
      required: true,
    },
    estimatedTime: {
      type: Number,
      required: false,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "printing", "done"],
      default: "pending",
    },
    gcodeFilePath: {
      type: String,
      required: false,
    },
  },
  { _id: true }
);

const OrderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: false,
      default: "",
    },
    filePath: {
      type: String,
      required: false,
    },
    originalFileName: {
      type: String,
      required: false,
    },
    totalCopies: {
      type: Number,
      required: true,
      default: 1,
    },
    partsPerFile: {
      type: Number,
      required: true,
      default: 1,
    },
    priority: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
      max: 5,
    },
    requirements: {
      volume: {
        x: { type: Number, required: false, default: 0 },
        y: { type: Number, required: false, default: 0 },
        z: { type: Number, required: false, default: 0 },
      },
      material: {
        type: String,
        required: false,
        default: "",
      },
      compatiblePrinters: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Printer",
        },
      ],
    },
    estimatedPrintTime: {
      type: Number,
      required: true,
      default: 0,
    },
    optimizationMode: {
      type: String,
      enum: ["min_time", "min_idle"],
      default: "min_time",
    },
    status: {
      type: String,
      enum: ["queued", "calculated", "scheduled", "printing", "done", "canceled"],
      default: "queued",
    },
    assignments: [AssignmentSchema],
    totalEstimatedTime: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
