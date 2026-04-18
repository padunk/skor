import type { Player } from "../types";

/**
 * Capitalize a name properly (first letter of each word uppercase)
 */
function capitalizeName(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Remove invisible Unicode characters from a string
 */
function cleanInvisibleChars(str: string): string {
  // Remove zero-width characters, word joiner, etc.
  return str.replace(
    /[\u200B-\u200D\uFEFF\u2060\u00AD\u061C\u200A-\u200F\u2028\u2029\u2061-\u2064]/g,
    "",
  );
}

/**
 * Parse participant string into Player objects
 * Format: "1. Rina Feb (f)" OR "Rina Feb (f)" (without number)
 * Handles multi-word names like "Rina Feb", "Henry A", "Rina R"
 */
export function parseParticipants(input: string): {
  players: Player[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const players: Player[] = [];

  // Clean invisible Unicode characters from input
  const cleanedInput = cleanInvisibleChars(input);

  // Split input into lines first
  const lines = cleanedInput
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line);

  // Pattern 1: Numbered format "1. name (g)" or "1. name(g)"
  const numberedPattern = /^\s*(\d+)\.\s*(.+?)\s*[([]?\s*([mfMF])\s*[)\]]?\s*$/;

  // Pattern 2: Non-numbered format "name (g)" or "name(g)"
  const nonNumberedPattern =
    /^([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s*[([]?\s*([mfMF])\s*[)\]]?\s*$/;

  for (const line of lines) {
    // Try numbered format first
    let match = line.match(numberedPattern);

    if (match) {
      let name = match[2].trim();
      const genderChar = match[3].toLowerCase();

      name = capitalizeName(name);

      if (name.length > 0 && name.length < 50) {
        players.push({
          id: crypto.randomUUID(),
          name,
          gender: genderChar as "m" | "f",
          isPlaceholder: false,
        });
      }
      continue;
    }

    // Try non-numbered format
    match = line.match(nonNumberedPattern);

    if (match) {
      let name = match[1].trim();
      const genderChar = match[2].toLowerCase();

      name = capitalizeName(name);

      if (name.length > 0 && name.length < 50) {
        players.push({
          id: crypto.randomUUID(),
          name,
          gender: genderChar as "m" | "f",
          isPlaceholder: false,
        });
      }
    }
  }

  // Remove duplicates based on name (case insensitive)
  const seen = new Set<string>();
  const uniquePlayers = players.filter((p) => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) {
      warnings.push(`Duplicate participant "${p.name}" skipped`);
      return false;
    }
    seen.add(key);
    return true;
  });

  // Handle odd number of participants
  if (uniquePlayers.length % 2 !== 0) {
    const males = uniquePlayers.filter((p) => p.gender === "m");
    const females = uniquePlayers.filter((p) => p.gender === "f");

    let placeholderGender: "m" | "f";
    if (males.length > females.length) {
      placeholderGender = "f";
    } else if (females.length > males.length) {
      placeholderGender = "m";
    } else {
      placeholderGender = Math.random() > 0.5 ? "m" : "f";
    }

    // Use Smith as the placeholder name
    const placeholderName = placeholderGender === "m" ? "Mr. X" : "Ms. X";
    uniquePlayers.push({
      id: crypto.randomUUID(),
      name: placeholderName,
      gender: placeholderGender,
      isPlaceholder: true,
    });
    warnings.push(`Added "${placeholderName}" to balance teams`);
  }

  return { players: uniquePlayers, warnings };
}

/**
 * Validate participant input
 */
export function validateParticipants(input: string): {
  valid: boolean;
  error?: string;
} {
  if (!input.trim()) {
    return { valid: false, error: "Please enter at least one participant" };
  }

  const { players } = parseParticipants(input);

  if (players.length < 2) {
    return {
      valid: false,
      error: "Need at least 2 participants to form teams",
    };
  }

  if (players.length > 20) {
    return { valid: false, error: "Maximum 20 participants allowed" };
  }

  return { valid: true };
}
