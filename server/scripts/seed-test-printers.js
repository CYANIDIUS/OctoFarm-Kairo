/**
 * Seed script: creates test printers with specifications for testing
 * the order scheduling module without real OctoPrint instances.
 *
 * Creates 6 printers in 3 groups:
 *   Group A: 3× Ender 3 V2, brass 0.4mm, black PETG
 *   Group B: 2× Anycubic Kobra S1 Combo, brass 0.4mm, white PLA
 *   Group C: 1× Anycubic Kobra S1 Combo, stainless 0.2mm, black ABS
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
    specifications: {
      bedSize: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        z: { type: Number, default: 0 },
      },
      nozzleDiameter: { type: Number, default: 0.4 },
      nozzleMaterial: { type: String, default: "Brass" },
      supportedMaterials: { type: [String], default: [] },
      printSpeed: { type: Number, default: 60 },
    },
    loadedFilament: {
      type: { type: String, default: "" },
      color: { type: String, default: "" },
    },
  },
  { strict: false, collection: "printers" }
);

const Printer = mongoose.model("Printer", printerSchema);

const testPrinters = [
  // Group A: 3× Ender 3 V2, brass 0.4mm, black PETG
  {
    settingsAppearance: { name: "Ender 3 V2" },
    printerURL: "http://192.168.1.101:5000",
    apikey: "test-key-001",
    printerName: "Ender 3 V2 #1",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      nozzleMaterial: "Brass",
      supportedMaterials: ["PLA", "PETG", "ABS"],
      printSpeed: 150,
    },
    loadedFilament: { type: "PETG", color: "Black" },
  },
  {
    settingsAppearance: { name: "Ender 3 V2" },
    printerURL: "http://192.168.1.102:5000",
    apikey: "test-key-002",
    printerName: "Ender 3 V2 #2",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      nozzleMaterial: "Brass",
      supportedMaterials: ["PLA", "PETG", "ABS"],
      printSpeed: 150,
    },
    loadedFilament: { type: "PETG", color: "Black" },
  },
  {
    settingsAppearance: { name: "Ender 3 V2" },
    printerURL: "http://192.168.1.103:5000",
    apikey: "test-key-003",
    printerName: "Ender 3 V2 #3",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      nozzleMaterial: "Brass",
      supportedMaterials: ["PLA", "PETG", "ABS"],
      printSpeed: 150,
    },
    loadedFilament: { type: "PETG", color: "Black" },
  },
  // Group B: 2× Anycubic Kobra S1 Combo, brass 0.4mm, white PLA
  {
    settingsAppearance: { name: "Anycubic Kobra S1 Combo" },
    printerURL: "http://192.168.1.104:5000",
    apikey: "test-key-004",
    printerName: "Anycubic Kobra S1 Combo #1",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      nozzleMaterial: "Brass",
      supportedMaterials: ["PLA", "PETG", "TPU", "ABS"],
      printSpeed: 300,
    },
    loadedFilament: { type: "PLA", color: "White" },
  },
  {
    settingsAppearance: { name: "Anycubic Kobra S1 Combo" },
    printerURL: "http://192.168.1.105:5000",
    apikey: "test-key-005",
    printerName: "Anycubic Kobra S1 Combo #2",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.4,
      nozzleMaterial: "Brass",
      supportedMaterials: ["PLA", "PETG", "TPU", "ABS"],
      printSpeed: 300,
    },
    loadedFilament: { type: "PLA", color: "White" },
  },
  // Group C: 1× Anycubic Kobra S1 Combo, stainless 0.2mm, black ABS
  {
    settingsAppearance: { name: "Anycubic Kobra S1 Combo" },
    printerURL: "http://192.168.1.106:5000",
    apikey: "test-key-006",
    printerName: "Anycubic Kobra S1 Combo #3",
    specifications: {
      bedSize: { x: 220, y: 220, z: 250 },
      nozzleDiameter: 0.2,
      nozzleMaterial: "Stainless Steel",
      supportedMaterials: ["PLA", "PETG", "TPU", "ABS"],
      printSpeed: 300,
    },
    loadedFilament: { type: "ABS", color: "Black" },
  },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB:", MONGO);
    await mongoose.connect(MONGO);
    console.log("Connected.");

    // Remove old test printers (by API key prefix) to start clean
    const deleteResult = await Printer.deleteMany({
      apikey: { $regex: /^test-key-/ },
    });
    if (deleteResult.deletedCount > 0) {
      console.log(`Removed ${deleteResult.deletedCount} old test printer(s).`);
    }

    console.log("Creating 6 test printers in 3 groups...");
    for (const tp of testPrinters) {
      const p = new Printer(tp);
      await p.save();
      const groupInfo = `${tp.specifications.nozzleDiameter}mm ${tp.specifications.nozzleMaterial}, ${tp.loadedFilament.color} ${tp.loadedFilament.type}`;
      console.log(`  Created: ${tp.printerName} (${groupInfo}) → ID: ${p._id}`);
    }

    console.log("\nDone! 6 test printers created in 3 groups:");
    console.log("  Group A: 3× Ender 3 V2 (0.4mm Brass, PETG Black)");
    console.log("  Group B: 2× Anycubic Kobra S1 Combo (0.4mm Brass, PLA White)");
    console.log("  Group C: 1× Anycubic Kobra S1 Combo (0.2mm Stainless Steel, ABS Black)");
    console.log(
      "\nYou can now create orders and use /calculate to test group-based scheduling."
    );
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
