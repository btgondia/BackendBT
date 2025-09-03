// Routes/assemblyDevices.routes.js
const router = require("express").Router();
const AssemblyDevice = require("../Models/AssemblyDevice"); // capital M as you created

// GET /api/assembly-devices  -> fetch all 20
router.get("/", async (req, res) => {
  try {
    // Optionally scope by institute: const institute_uuid = req.user?.institute_uuid || req.query.institute_uuid || null;
    // For now, global scope (no institute field filter)
    const docs = await AssemblyDevice.find({}).lean();

    const byNum = new Map(docs.map(d => [d.device_number, d]));
    const devices = Array.from({ length: 20 }, (_, i) => {
      const device_number = i + 1;
      return byNum.get(device_number) || { device_number, url: "" };
    }).sort((a, b) => a.device_number - b.device_number);

    res.json({ devices });
  } catch (err) {
    console.error("GET /api/assembly-devices error:", err);
    res.status(500).json({ message: "Failed to fetch devices" });
  }
});

// PUT /api/assembly-devices  -> save all 20 at once (bulk upsert)
router.put("/", async (req, res) => {
  try {
    const { devices } = req.body;
    if (!Array.isArray(devices)) {
      return res.status(400).json({ message: "`devices` must be an array" });
    }

    // normalize to exactly 20: device_number 1..20; missing -> empty url
    const normalized = Array.from({ length: 20 }, (_, idx) => {
      const device_number = idx + 1;
      const found = devices.find(d => Number(d?.device_number) === device_number);
      return { device_number, url: (found?.url || "").trim() };
    });

    const ops = normalized.map(d => ({
      updateOne: {
        filter: { device_number: d.device_number },
        update: { $set: { device_number: d.device_number, url: d.url } },
        upsert: true,
      },
    }));

    await AssemblyDevice.bulkWrite(ops, { ordered: true });

    // return fresh list
    const fresh = await AssemblyDevice.find({}).lean();
    const map = new Map(fresh.map(d => [d.device_number, d]));
    const result = Array.from({ length: 20 }, (_, i) => map.get(i + 1) || { device_number: i + 1, url: "" })
      .sort((a, b) => a.device_number - b.device_number);

    res.json({ devices: result });
  } catch (err) {
    console.error("PUT /api/assembly-devices error:", err);
    res.status(500).json({ message: "Failed to save devices" });
  }
});

module.exports = router;
