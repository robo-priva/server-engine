"use strict";

/*
=========================================================
 VILLAGECARE — OFFLINE HEALTH GUIDANCE ENGINE
=========================================================

Purpose:
- Validate assessment details.
- Identify selected emergency warning signs.
- Provide conservative next-step guidance.
- Avoid diagnoses and medication recommendations.

IMPORTANT:
This is a development prototype, not a clinically
validated medical triage system.
=========================================================
*/

const EMERGENCY_RULES = [
    {
        id: "breathing_emergency",
        patterns: [
            /\b(severe|serious|extreme)\s+(difficulty|trouble|problem)s?\s+(breathing|breath)\b/i,
            /\b(can't|cannot|unable to)\s+breathe\b/i,
            /\b(gasping for air|struggling to breathe)\b/i
        ]
    },
    {
        id: "unconsciousness",
        patterns: [
            /\b(unconscious|unresponsive)\b/i,
            /\b(difficult|impossible)\s+to\s+wake\b/i,
            /\bnot waking up\b/i
        ]
    },
    {
        id: "severe_bleeding",
        patterns: [
            /\b(severe|heavy|uncontrolled)\s+bleeding\b/i,
            /\bbleeding\s+(won't|will not|doesn't)\s+stop\b/i
        ]
    },
    {
        id: "stroke_warning",
        patterns: [
            /\b(sudden|new)\s+(face droop|facial drooping)\b/i,
            /\b(sudden|new)\s+(weakness|numbness)\s+(on|in)\s+(one|a single)\s+side\b/i,
            /\b(sudden)\s+(difficulty speaking|slurred speech)\b/i
        ]
    },
    {
        id: "seizure_emergency",
        patterns: [
            /\bseizure\b.*\b(first|longer than five minutes|5 minutes|repeated)\b/i,
            /\b(first|repeated)\s+seizure\b/i,
            /\bseizure\b.*\b(not waking|not recovering)\b/i
        ]
    },
    {
        id: "severe_chest_pain",
        patterns: [
            /\b(severe|crushing)\s+chest pain\b/i,
            /\bchest pain\b.*\b(shortness of breath|fainting|collapse)\b/i
        ]
    }
];

function validateAssessment(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return "Please submit a valid assessment.";
    }

    const { age, symptoms, consent } = input;

    if (
        age === undefined ||
        age === null ||
        age === "" ||
        !Number.isInteger(Number(age)) ||
        Number(age) < 0 ||
        Number(age) > 120
    ) {
        return "Please enter an age between 0 and 120.";
    }

    if (typeof symptoms !== "string") {
        return "Please describe the symptoms.";
    }

    const cleanedSymptoms = symptoms.trim();

    if (cleanedSymptoms.length < 5) {
        return "Please describe the symptoms in at least 5 characters.";
    }

    if (cleanedSymptoms.length > 2000) {
        return "Your description is too long. Please use no more than 2000 characters.";
    }

    if (consent !== true) {
        return "Please confirm that you understand the limitations of this guidance.";
    }

    return null;
}

function detectEmergencyWarning(signs) {
    for (const rule of EMERGENCY_RULES) {
        if (rule.patterns.some((pattern) => pattern.test(signs))) {
            return rule.id;
        }
    }

    return null;
}

function assessSymptoms(input) {
    const validationError = validateAssessment(input);

    if (validationError) {
        return {
            success: false,
            error: validationError
        };
    }

    const age = Number(input.age);
    const symptoms = input.symptoms.trim();

    const emergency = detectEmergencyWarning(symptoms);

    if (emergency) {
        return {
            success: true,
            assessmentType: "emergency_warning",
            urgency: "urgent",
            guidance:
                "Your description includes a possible emergency warning sign. " +
                "Seek emergency medical assistance immediately or go to the nearest " +
                "health facility. Do not wait for this tool to assess you further. " +
                "If possible, ask someone nearby to help.",
            emergencyWarning: true,
            disclaimer:
                "This tool cannot diagnose or rule out an emergency. " +
                "If you feel seriously unwell, seek urgent medical help even if " +
                "this tool does not identify a warning sign."
        };
    }

    let guidance;

    if (age < 5) {
        guidance =
            "Young children can become unwell quickly. Please contact a qualified " +
            "health worker promptly for advice about these symptoms, especially if " +
            "the child is feeding poorly, has a fever, seems unusually sleepy, or " +
            "is getting worse.";
    } else {
        guidance =
            "This offline prototype cannot determine the cause of your symptoms. " +
            "Arrange an assessment with a qualified health worker, particularly if " +
            "symptoms persist, worsen, or concern you. Seek urgent help if severe " +
            "or sudden warning signs develop.";
    }

    return {
        success: true,
        assessmentType: "general_guidance",
        urgency: "needs_assessment",
        guidance,
        emergencyWarning: false,
        disclaimer:
            "This is general health information, not a diagnosis or treatment plan. " +
            "The offline rules are limited and may miss emergencies. " +
            "Do not delay seeking medical care because of this result."
    };
}

module.exports = {
    assessSymptoms,
    validateAssessment,
    detectEmergencyWarning
};
