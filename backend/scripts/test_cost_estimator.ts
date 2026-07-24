import { calculateShipmentCost, parseDutyRate } from '../src/services/costEstimator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("--- STARTING COST ESTIMATOR UNIT TESTS ---\n");

  // Test Case 1: Simple Percentage Duty & Informal Entry MPF
  console.log("Test Case 1: Simple Percentage Duty & Informal Entry MPF...");
  const tc1 = calculateShipmentCost({
    declaredValue: 1000.00,
    weight: 10.00,
    hsCode: "test-code",
    dutyRate: "6%",
    freightRatePerKg: 4.50,
    freightMinCharge: 50.00
  });
  assert(tc1.dutyAmount === 60.00, `Expected duty $60, got ${tc1.dutyAmount}`);
  assert(tc1.mpfAmount === 2.69, `Expected informal MPF $2.69, got ${tc1.mpfAmount}`);
  assert(tc1.freightCost === 50.00, `Expected clamped min freight $50, got ${tc1.freightCost}`);
  assert(tc1.insuranceCost === 5.00, `Expected insurance $5, got ${tc1.insuranceCost}`);
  assert(tc1.totalLandedCost === 1117.69, `Expected total $1117.69, got ${tc1.totalLandedCost}`);
  console.log("✅ Passed");

  // Test Case 2: Compound Duty Rate
  console.log("Test Case 2: Compound Duty Rate ($1.035/kg + 13.6%)...");
  const tc2 = calculateShipmentCost({
    declaredValue: 1000.00,
    weight: 50.00,
    hsCode: "test-code",
    dutyRate: "$1.035/kg + 13.6%",
    freightRatePerKg: 4.50,
    freightMinCharge: 50.00
  });
  // Duty = (1.035 * 50) + (0.136 * 1000) = 51.75 + 136 = 187.75
  assert(tc2.dutyAmount === 187.75, `Expected duty $187.75, got ${tc2.dutyAmount}`);
  console.log("✅ Passed");

  // Test Case 3: Formal Entry MPF Minimum Limit Clamping
  console.log("Test Case 3: Formal Entry MPF Min Limit Clamping ($33.58)...");
  const tc3 = calculateShipmentCost({
    declaredValue: 3000.00, // Above formal entry threshold ($2500)
    weight: 10.00,
    hsCode: "test-code",
    dutyRate: "Free",
    freightRatePerKg: 4.50,
    freightMinCharge: 50.00
  });
  // Calculated MPF = 3000 * 0.003464 = 10.392 (clamped to MIN $33.58)
  assert(tc3.mpfAmount === 33.58, `Expected formal minimum MPF $33.58, got ${tc3.mpfAmount}`);
  console.log("✅ Passed");

  // Test Case 4: Formal Entry MPF Maximum Limit Clamping
  console.log("Test Case 4: Formal Entry MPF Max Limit Clamping ($651.50)...");
  const tc4 = calculateShipmentCost({
    declaredValue: 300000.00, // Very high value
    weight: 10.00,
    hsCode: "test-code",
    dutyRate: "Free",
    freightRatePerKg: 4.50,
    freightMinCharge: 50.00
  });
  // Calculated MPF = 300000 * 0.003464 = 1039.2 (clamped to MAX $651.50)
  assert(tc4.mpfAmount === 651.50, `Expected formal maximum MPF $651.50, got ${tc4.mpfAmount}`);
  console.log("✅ Passed");

  // Test Case 5: De Minimis Exemption
  console.log("Test Case 5: De Minimis Exemption (Value < $800)...");
  const tc5 = calculateShipmentCost({
    declaredValue: 750.00, // Below de minimis threshold ($800)
    weight: 10.00,
    hsCode: "test-code",
    dutyRate: "10%",
    freightRatePerKg: 4.50,
    freightMinCharge: 50.00
  });
  assert(tc5.dutyAmount === 0.00, `Expected duty exempt $0, got ${tc5.dutyAmount}`);
  assert(tc5.mpfAmount === 0.00, `Expected MPF exempt $0, got ${tc5.mpfAmount}`);
  console.log("✅ Passed");

  // Test Case 6: Freight weight rate calculation (exceeds min charge)
  console.log("Test Case 6: Freight weight rate calculation (20kg * $4.50)...");
  const tc6 = calculateShipmentCost({
    declaredValue: 1000.00,
    weight: 20.00,
    hsCode: "test-code",
    dutyRate: "Free",
    freightRatePerKg: 4.50,
    freightMinCharge: 50.00
  });
  assert(tc6.freightCost === 90.00, `Expected freight $90 (20 * 4.5), got ${tc6.freightCost}`);
  console.log("✅ Passed");

  // Test Case 7: Unparseable Duty Rate format error handling
  console.log("Test Case 7: Validation error throwing for unsupported units...");
  try {
    parseDutyRate("0.2¢ each + 7%");
    assert(false, "Expected parse failure error but succeeded");
  } catch (err: any) {
    assert(err.message.includes("Unsupported or unparseable"), "Expected custom error message format");
  }
  console.log("✅ Passed");

  console.log("\n🎉 ALL COST ESTIMATOR UNIT TESTS PASSED SUCCESSFULLY! 🎉");
}

try {
  runTests();
} catch (e: any) {
  console.error("\n❌ UNIT TEST RUN FAILED:", e.message);
  process.exit(1);
}
