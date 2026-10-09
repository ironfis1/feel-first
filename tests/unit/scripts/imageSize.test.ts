import { describe, expect, it } from "vitest";
import { imageSize } from "../../../scripts/ingest/lib/imageSize.ts";

// High tier (docs/test-tiers.md). Reads the size the 1,200px rule depends on [D-002].

const bytes = (...parts: number[][]) => new Uint8Array(parts.flat());
const u16 = (n: number) => [n >> 8, n & 0xff];
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

/** A segment: FF, marker, two-byte length (counting itself), body. */
const segment = (marker: number, body: number[]) => [0xff, marker, ...u16(body.length + 2), ...body];
/** A start-of-frame body: precision, height, width, one component. */
const frame = (height: number, width: number) => [8, ...u16(height), ...u16(width), 1, 1, 0x11, 0];
const soi = [0xff, 0xd8];

const png = (width: number, height: number) =>
  bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], u32(13), [0x49, 0x48, 0x44, 0x52], u32(width), u32(height), [8, 6, 0, 0, 0]);

describe("imageSize", () => {
  it("reads a PNG's IHDR size", () => {
    expect(imageSize(png(1600, 2400))).toEqual({ width: 1600, height: 2400 });
  });

  it("gives null for a PNG cut short before its size", () => {
    expect(imageSize(png(1600, 2400).slice(0, 23))).toBeNull();
  });

  it("reads a baseline JPEG frame, height before width", () => {
    expect(imageSize(bytes(soi, segment(0xc0, frame(3184, 4000))))).toEqual({ width: 4000, height: 3184 });
  });

  it("reads a progressive JPEG frame", () => {
    expect(imageSize(bytes(soi, segment(0xc2, frame(1789, 1200))))).toEqual({ width: 1200, height: 1789 });
  });

  it("skips an EXIF segment by its length, even when it holds a thumbnail's frame", () => {
    const exif = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, ...segment(0xc0, frame(120, 160))]);
    expect(imageSize(bytes(soi, exif, segment(0xc0, frame(2000, 3000))))).toEqual({ width: 3000, height: 2000 });
  });

  it.each([0xc4, 0xc8, 0xcc])("does not read marker %s as a frame", (marker) => {
    const notFrame = segment(marker, frame(10, 10));
    expect(imageSize(bytes(soi, notFrame, segment(0xc0, frame(1500, 1300))))).toEqual({ width: 1300, height: 1500 });
  });

  it("steps over fill bytes before a marker", () => {
    expect(imageSize(bytes(soi, [0xff], segment(0xc0, frame(1400, 1300))))).toEqual({ width: 1300, height: 1400 });
  });

  it("reads a frame header that ends exactly at the end of the bytes", () => {
    const tight = bytes(soi, segment(0xc0, frame(1400, 1300)).slice(0, 9));
    expect(imageSize(tight)).toEqual({ width: 1300, height: 1400 });
  });

  it("gives null when the bytes end before any frame", () => {
    expect(imageSize(bytes(soi, segment(0xe0, [1, 2, 3, 4, 5, 6, 7, 8, 9])))).toBeNull();
    expect(imageSize(bytes(soi, segment(0xc0, frame(1400, 1300)).slice(0, 8)))).toBeNull();
  });

  it("gives null when a marker is not where the segment lengths say", () => {
    expect(imageSize(bytes(soi, [0x00, 0xc0], u16(17), frame(1400, 1300)))).toBeNull();
  });

  it("reads a PNG of exactly 24 bytes, and the rare SOF15 frame", () => {
    expect(imageSize(png(1300, 1400).slice(0, 24))).toEqual({ width: 1300, height: 1400 });
    expect(imageSize(bytes(soi, segment(0xcf, frame(1400, 1300))))).toEqual({ width: 1300, height: 1400 });
  });

  it("needs the JPEG and PNG signatures, not just a frame or enough bytes", () => {
    expect(imageSize(bytes([0x00, 0xd8], segment(0xc0, frame(1400, 1300))))).toBeNull();
    expect(imageSize(bytes([0xff, 0x00], segment(0xc0, frame(1400, 1300))))).toBeNull();
    expect(imageSize(new Uint8Array(40).fill(0x41))).toBeNull();
    const notPng = png(1300, 1400);
    notPng[3] = 0x00;
    expect(imageSize(notPng)).toBeNull();
  });

  it.each([
    ["GIF", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]],
    ["HTML", [...new TextEncoder().encode("<!DOCTYPE html><html>")]],
    ["empty", []],
  ])("gives null for %s", (_label, data) => {
    expect(imageSize(new Uint8Array(data))).toBeNull();
  });
});
