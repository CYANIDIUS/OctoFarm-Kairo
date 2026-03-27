/**
 * Seed script: creates test printers with specifications for testing
 * the order scheduling module without real OctoPrint instances.
 *
 * Usage (inside Docker container):
 *   docker compose exec octofarm node server/scripts/seed-test-printers.js
 *
 * Or from host with MONGO env var:
 *   MONGO=mongodb://localhost:27017/octofarm node server/scripts/seed-test-printers.js
 */

const mongoose = require("mongoose");

const MONGO = process.env.MONGO || "mongodb://mongo:27017/octofarm";

// Minimal Printer schema — just enough to insert test data
// The full schema is in server/models/Printer.js but it has many dependencies
const printerSchema = new mongoose.Schema(
  {
    settingsAppearance: {
      name: { type: String, default: "Test Printer" },
    },
    printerURL: { type: String, default: "http://localhost" },
    apikey: { type: String, default: "test-api-key" },
    group: { type: String, default: "" },
    category: { type: String, default: "" },
    // New fields for order scheduling
    specifications: {
      bedSize: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        z: { type: Number, default: 0 },
      },
      nozzleDiameter: { type: Number, default: 0.4 },
      supportedMaterials: { type: [String], default: [] },
      printSpeed: { type: Number, default: 60 },
    },
  },
  { strict: false, collection: "printers" }
);

const Printer = mongoose.model("Printer", printerSchema);

const testPrinters = [
  {
    settingsAppearance: { name: "Anycubic Kobra S1 Combo" },
    printerURL: "http://192.168.1.101:5000",
    apikey: "test-key-001",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      supportedMaterials: ["PLA", "PETG", "TPU", "ABS"],
      printSpeed: 300,
    },
  },
  {
    settingsAppearance: { name: "Ender 3 V2" },
    printerURL: "http://192.168.1.102:5000",
    apikey: "test-key-002",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      supportedMaterials: ["PLA", "PETG", "ABS"],
      printSpeed: 150,
    },
  },
  {
    settingsAppearance: { name: "Prusa i3 MK3S+" },
    printerURL: "http://192.168.1.103:5000",
    apikey: "test-key-003",
    specifications: {
      bedSize: { x: 250, y: 210, z: 210 },
      nozzleDiameter: 0.4,
      supportedMaterials: ["PLA", "PETG", "ASA", "ABS", "TPU"],
      printSpeed: 200,
    },
  },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB:", MONGO);
    await mongoose.connect(MONGO);
    console.log("Connected.");

    // Check if test printers already exist
    const existing = await Printer.find({
      "settingsAppearance.name": {
        $in: testPrinters.map((p) => p.settingsAppearance.name),
      },
    });

    if (existing.length > 0) {
      console.log(
        "Test printers already exist:",
        existing.map((p) => p.settingsAppearance.name).join(", ")
      );
      console.log("Updating specifications...");

      for (const tp of testPrinters) {
        await Printer.updateOne(
          { "settingsAppearance.name": tp.settingsAppearance.name },
          { $set: { specifications: tp.specifications } }
        );
        console.log("  Updated:", tp.settingsAppearance.name);
      }
    } else {
      console.log("Creating test printers...");
      for (const tp of testPrinters) {
        const p = new Printer(tp);
        await p.save();
        console.log("  Created:", tp.settingsAppearance.name, "→ ID:", p._id);
      }
    }

    console.log("\nDone! Test printers are ready.");
    console.log(
      "You can now create orders and use /calculate to test scheduling."
    );
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
