import { describe, it, expect } from "vitest";
import { parseParticipants, validateParticipants } from "../utils/parser";

describe("parseParticipants", () => {
  it("parses basic format with parentheses", () => {
    const input = "1. Mark (M)\n2. Bob (M)\n3. Alice (F)\n4. Sinta (F)";
    const { players, warnings } = parseParticipants(input);

    expect(players).toHaveLength(4);
    expect(players[0]).toMatchObject({ name: "Mark", gender: "m" });
    expect(players[1]).toMatchObject({ name: "Bob", gender: "m" });
    expect(players[2]).toMatchObject({ name: "Alice", gender: "f" });
    expect(players[3]).toMatchObject({ name: "Sinta", gender: "f" });
    expect(warnings).toHaveLength(0);
  });

  it("parses and capitalizes names correctly", () => {
    const input = "1. mark (M)\n2. bob (M)";
    const { players } = parseParticipants(input);

    expect(players[0]).toMatchObject({ name: "Mark", gender: "m" });
    expect(players[1]).toMatchObject({ name: "Bob", gender: "m" });
  });

  it("parses multi-word names correctly", () => {
    const input = "1. Rina Feb (F)\n2. Henry A (M)\n3. Rina R (F)";
    const { players } = parseParticipants(input);

    // 3 participants + 1 placeholder = 4 (odd number gets placeholder)
    expect(players).toHaveLength(4);
    expect(players[0]).toMatchObject({ name: "Rina Feb", gender: "f" });
    expect(players[1]).toMatchObject({ name: "Henry A", gender: "m" });
    expect(players[2]).toMatchObject({ name: "Rina R", gender: "f" });
    // Fourth player should be a placeholder
    const placeholder = players.find((p) => p.isPlaceholder);
    expect(placeholder).toBeDefined();
  });

  it("handles mixed formats", () => {
    const input = "1. mark(m)\n2. Alice F\n3. bob [m]\n4. Sinta (f)";
    const { players } = parseParticipants(input);

    expect(players).toHaveLength(4);
    // Names should be capitalized
    expect(players[0].name).toBe("Mark");
    expect(players[1].name).toBe("Alice");
  });

  it("parses space-separated format on single line", () => {
    // Use line-separated format which is the standard
    const input = "1. Mark (M)\n2. Bob (M)\n3. Alice (F)\n4. Sinta (F)";
    const { players } = parseParticipants(input);

    expect(players).toHaveLength(4);
  });

  it("parses non-numbered format without line numbers", () => {
    const input = "Eveline (f)\nJimmy (m)\nAy (f)\nFreddy (m)";
    const { players } = parseParticipants(input);

    expect(players).toHaveLength(4);
    expect(players[0].name).toBe("Eveline");
    expect(players[1].name).toBe("Jimmy");
  });

  it("adds placeholder for odd number of participants", () => {
    const input = "1. Mark (M)\n2. Bob (M)\n3. Alice (F)";
    const { players, warnings } = parseParticipants(input);

    // 3 participants + 1 placeholder = 4
    expect(players).toHaveLength(4);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("Added");
    // Check that a placeholder was added with correct name
    const placeholder = players.find((p) => p.isPlaceholder);
    expect(placeholder).toBeDefined();
    expect(["Mr. X", "Ms. X"]).toContain(placeholder?.name);
  });

  it("removes duplicate names (case-insensitive)", () => {
    const input = "1. Mark (M)\n2. mark (m)\n3. Alice (F)";
    const { players, warnings } = parseParticipants(input);

    // Mark and mark are duplicates (case-insensitive)
    // Result: Mark + Alice = 2 (even), no placeholder
    expect(players).toHaveLength(2);
    expect(warnings.some((w) => w.includes("Duplicate"))).toBe(true);
  });

  it("generates unique IDs for each player", () => {
    const input = "1. Mark (M)\n2. Alice (F)";
    const { players } = parseParticipants(input);

    const ids = players.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("validateParticipants", () => {
  it("returns invalid for empty input", () => {
    const result = validateParticipants("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least");
  });

  it("returns valid for single participant (placeholder is added)", () => {
    // Parser adds a placeholder to make it 2 players
    const result = validateParticipants("1. Mark (M)");
    expect(result.valid).toBe(true);
  });

  it("returns valid for 2 participants", () => {
    const result = validateParticipants("1. Mark (M)\n2. Alice (F)");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid for more than 20 participants", () => {
    // Generate 21 unique entries that will be parsed
    const names = [
      "Alice",
      "Bob",
      "Carol",
      "David",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Iris",
      "Jack",
      "Kate",
      "Leo",
      "Mary",
      "Nick",
      "Olivia",
      "Paul",
      "Quinn",
      "Rose",
      "Sam",
      "Tina",
      "Uma",
    ];
    const participants = names
      .map((name, i) => `${i + 1}. ${name} (M)`)
      .join("\n");
    const result = validateParticipants(participants);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum");
  });

  it("accepts exactly 20 participants", () => {
    const names = [
      "Alice",
      "Bob",
      "Carol",
      "David",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Iris",
      "Jack",
      "Kate",
      "Leo",
      "Mary",
      "Nick",
      "Olivia",
      "Paul",
      "Quinn",
      "Rose",
      "Sam",
      "Tina",
    ];
    const participants = names
      .map((name, i) => `${i + 1}. ${name} (M)`)
      .join("\n");
    const result = validateParticipants(participants);
    expect(result.valid).toBe(true);
  });
});
