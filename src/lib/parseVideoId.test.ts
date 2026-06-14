import { describe, it, expect } from "vitest";
import { parseInput } from "@/lib/parseVideoId";

describe("parseInput", () => {
  describe("URL → { type: 'video' }", () => {
    it("youtu.be/<id>", () => {
      expect(parseInput("https://youtu.be/dQw4w9WgXcQ")).toEqual({
        type: "video",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("youtube.com/watch?v=<id>", () => {
      expect(parseInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
        type: "video",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("youtube.com/watch?v=<id> with extra query params", () => {
      expect(
        parseInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123"),
      ).toEqual({ type: "video", videoId: "dQw4w9WgXcQ" });
    });

    it("youtube.com/shorts/<id>", () => {
      expect(parseInput("https://youtube.com/shorts/dQw4w9WgXcQ")).toEqual({
        type: "video",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("youtube.com/embed/<id>", () => {
      expect(parseInput("https://www.youtube.com/embed/dQw4w9WgXcQ")).toEqual({
        type: "video",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("youtu.be/<id> with query params", () => {
      expect(parseInput("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toEqual({
        type: "video",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("trims surrounding whitespace before parsing a URL", () => {
      expect(parseInput("  https://youtu.be/dQw4w9WgXcQ  ")).toEqual({
        type: "video",
        videoId: "dQw4w9WgXcQ",
      });
    });
  });

  describe("bare 11-char id → { type: 'video' }", () => {
    it("accepts a standalone 11-character video id", () => {
      expect(parseInput("dQw4w9WgXcQ")).toEqual({
        type: "video",
        videoId: "dQw4w9WgXcQ",
      });
    });

    it("accepts ids containing - and _", () => {
      expect(parseInput("a_b-c1d2e3F")).toEqual({
        type: "video",
        videoId: "a_b-c1d2e3F",
      });
    });
  });

  describe("free text → { type: 'query' }", () => {
    it("treats a non-id phrase as a query", () => {
      expect(parseInput("백종원 레시피")).toEqual({
        type: "query",
        query: "백종원 레시피",
      });
    });

    it("a 10-char single token is a query, not a video id", () => {
      expect(parseInput("abcdefghij")).toEqual({
        type: "query",
        query: "abcdefghij",
      });
    });

    it("a 12-char single token is a query, not a video id", () => {
      expect(parseInput("abcdefghijkl")).toEqual({
        type: "query",
        query: "abcdefghijkl",
      });
    });

    it("trims surrounding whitespace from a query", () => {
      expect(parseInput("  cooking tips  ")).toEqual({
        type: "query",
        query: "cooking tips",
      });
    });
  });

  describe("empty input → throws", () => {
    it("throws on an empty string", () => {
      expect(() => parseInput("")).toThrow("input is empty");
    });

    it("throws on whitespace-only input", () => {
      expect(() => parseInput("   ")).toThrow("input is empty");
    });
  });
});
