"use strict";

const {
    assessSymptoms,
    validateAssessment,
    detectEmergencyWarning
} = require("../services/triageService");

const assert = require("node:assert/strict");

function runTest(name, testFunction) {
    try {
        testFunction();
        console.log("PASS:", name);
    } catch (error) {
        console.error("FAIL:", name);
        console.error(error.message);
        process.exitCode = 1;
    }
}

// 1. Valid general assessment
runTest("Accepts a valid assessment", () => {
    const result = assessSymptoms({
        age: 25,
        symptoms: "I have a mild headache",
        consent: true
    });

    assert.equal(result.success, true);
    assert.equal(result.assessmentType, "general_guidance");
});

// 2. Rejects missing symptoms
runTest("Rejects missing symptoms", () => {
    const error = validateAssessment({
        age: 25,
        symptoms: "",
        consent: true
    });

    assert.equal(typeof error, "string");
});

// 3. Rejects missing consent
runTest("Requires consent", () => {
    const result = assessSymptoms({
        age: 25,
        symptoms: "I have a headache",
        consent: false
    });

    assert.equal(result.success, false);
});

// 4. Detects a possible breathing emergency
runTest("Detects a possible breathing emergency", () => {
    const result = assessSymptoms({
        age: 30,
        symptoms: "I am struggling to breathe",
        consent: true
    });

    assert.equal(result.success, true);
    assert.equal(result.emergencyWarning, true);
    assert.equal(result.urgency, "urgent");
});

// 5. Rejects an invalid age
runTest("Rejects an invalid age", () => {
    const result = assessSymptoms({
        age: 150,
        symptoms: "I have a headache",
        consent: true
    });

    assert.equal(result.success, false);
});

// 6. Checks an emergency rule directly
runTest("Recognizes an unconscious person", () => {
    const result = detectEmergencyWarning(
        "The person is unconscious"
    );

    assert.equal(result, "unconsciousness");
});

console.log("\nVillageCare triage tests completed.");
