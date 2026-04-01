import { describe, it, expect } from "vitest";
import { buildCoachingPrompt } from "../core/coaching.js";

describe("buildCoachingPrompt", () => {
  it("includes the target language in the prompt", () => {
    const prompt = buildCoachingPrompt("Japanese");
    expect(prompt).toContain("specializing in Japanese");
    expect(prompt).toContain("[Japanese text]");
  });

  it("includes key formatting rules", () => {
    const prompt = buildCoachingPrompt("Mandarin Chinese");
    expect(prompt).toContain("Exactly 3 options");
    expect(prompt).toContain("casual to formal");
    expect(prompt).toContain("pinyin with tone marks for Mandarin");
    expect(prompt).toContain("romaji for Japanese");
  });

  it("includes the response format sections", () => {
    const prompt = buildCoachingPrompt("Korean");
    expect(prompt).toContain("## Options");
    expect(prompt).toContain("## Nuance");
    expect(prompt).toContain("## Social note");
    expect(prompt).toContain("Literal:");
    expect(prompt).toContain("Tone:");
  });

  it("emphasizes native speaker usage over textbook phrasing", () => {
    const prompt = buildCoachingPrompt("Spanish");
    expect(prompt).toContain("native speaker would ACTUALLY say");
    expect(prompt).toContain("NOT translation");
  });
});
