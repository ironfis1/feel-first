import type { z } from "zod";
import type { workSchema } from "@/lib/schemas";

/** Every Section 3.2 field, including J1's (the full M3 contract). */
type FullWork = z.infer<typeof workSchema>;

/** A complete, valid catalog work for schema tests. Override fields per test. */
export function validWork(overrides: Partial<Record<keyof FullWork, unknown>> = {}): Record<string, unknown> {
  return {
    id: "w-0001",
    title: "Test Work",
    artist: "Test Artist",
    date: "1900",
    source: "Test Source",
    sourceId: "T-1",
    lane: "fine-art",
    imageUrl: "https://example.org/full.jpg",
    thumbUrl: "/thumbs/w-0001.jpg",
    width: 2000,
    height: 1500,
    orientation: "landscape",
    valence: 0.2,
    arousal: -0.4,
    tags: ["serene", "tender", "awe"],
    palette: ["#112233", "#445566", "#778899", "#aabbcc", "#ddeeff"],
    subject: "landscape",
    license: "Public domain",
    ...overrides,
  };
}
