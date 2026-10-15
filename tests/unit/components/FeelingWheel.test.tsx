// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FeelingWheel, placeAt, pointFromKey } from "@/components/wheel/FeelingWheel";

// High tier (docs/test-tiers.md): FeelingWheel. Medium: pointFromKey, placeAt.
// Pointer, touch and arrow keys move the point; one gesture ends once [D-041, design-system.md].

afterEach(cleanup);

beforeAll(() => {
  // jsdom has no layout or pointer capture: the wheel is a 200px square at (0, 0).
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
});

describe("pointFromKey", () => {
  it("steps 0.05 in the arrow's direction, up being charged and right being bright", () => {
    expect(pointFromKey({ x: 0, y: 0 }, "ArrowRight", false)).toEqual({ x: 0.05, y: 0 });
    expect(pointFromKey({ x: 0, y: 0 }, "ArrowLeft", false)).toEqual({ x: -0.05, y: 0 });
    expect(pointFromKey({ x: 0, y: 0 }, "ArrowUp", false)).toEqual({ x: 0, y: 0.05 });
    expect(pointFromKey({ x: 0, y: 0 }, "ArrowDown", false)).toEqual({ x: 0, y: -0.05 });
  });

  it("takes a 0.2 step with Shift, ignores other keys and stays inside the wheel", () => {
    expect(pointFromKey({ x: 0, y: 0 }, "ArrowUp", true)).toEqual({ x: 0, y: 0.2 });
    expect(pointFromKey({ x: 0, y: 0 }, "Enter", false)).toBeNull();
    expect(pointFromKey({ x: 0.95, y: 0 }, "ArrowRight", true)).toEqual({ x: 1, y: 0 });
  });
});

describe("placeAt", () => {
  it("maps wheel points to CSS percentages, with up at the top", () => {
    expect(placeAt({ x: 0, y: 0 })).toEqual({ "--x": "50.00%", "--y": "50.00%" });
    expect(placeAt({ x: 1, y: 0 })).toEqual({ "--x": "100.00%", "--y": "50.00%" });
    expect(placeAt({ x: 0, y: 1 })).toEqual({ "--x": "50.00%", "--y": "0.00%" });
    expect(placeAt({ x: -1, y: -1 })).toEqual({ "--x": "0.00%", "--y": "100.00%" });
  });
});

describe("FeelingWheel", () => {
  const setup = (point = { x: 0, y: 0 }) => {
    const onMove = vi.fn();
    const onGestureEnd = vi.fn();
    render(<FeelingWheel point={point} onMove={onMove} onGestureEnd={onGestureEnd} />);
    return { onMove, onGestureEnd, wheel: screen.getByRole("slider") };
  };

  it("moves the point to where the pointer goes down, with y turned so up is charged", () => {
    const { onMove, wheel } = setup();
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 150, clientY: 50 });
    expect(onMove).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
  });

  it("follows a drag only while the pointer is down", () => {
    const { onMove, wheel } = setup();
    fireEvent.pointerMove(wheel, { clientX: 150, clientY: 100 });
    expect(onMove).not.toHaveBeenCalled();
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(wheel, { clientX: 150, clientY: 100 });
    expect(onMove).toHaveBeenLastCalledWith({ x: 0.5, y: -0 });
    fireEvent.pointerUp(wheel);
    fireEvent.pointerMove(wheel, { clientX: 50, clientY: 100 });
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it("ends a gesture once, on pointer up, with the points before and after", () => {
    const { onGestureEnd, wheel } = setup({ x: 0.1, y: 0.1 });
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(wheel, { clientX: 200, clientY: 100 });
    fireEvent.pointerUp(wheel);
    fireEvent.pointerUp(wheel);
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
    expect(onGestureEnd).toHaveBeenCalledWith({ x: 0.1, y: 0.1 }, { x: 1, y: -0 });
  });

  it("ends a gesture on cancel, and ignores an up with no down", () => {
    const { onGestureEnd, wheel } = setup();
    fireEvent.pointerUp(wheel);
    expect(onGestureEnd).not.toHaveBeenCalled();
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 100, clientY: 0 });
    fireEvent.pointerCancel(wheel);
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
  });

  it("keeps a pointer outside the disc on its rim", () => {
    const { onMove, wheel } = setup();
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 400, clientY: 100 });
    expect(onMove).toHaveBeenCalledWith({ x: 1, y: -0 });
  });

  it("moves and ends a gesture once per arrow key, and leaves other keys alone", () => {
    const { onMove, onGestureEnd, wheel } = setup();
    const arrow = fireEvent.keyDown(wheel, { key: "ArrowUp" });
    expect(arrow).toBe(false); // default prevented, so the page does not scroll
    expect(onMove).toHaveBeenCalledWith({ x: 0, y: 0.05 });
    expect(onGestureEnd).toHaveBeenCalledWith({ x: 0, y: 0 }, { x: 0, y: 0.05 });
    expect(fireEvent.keyDown(wheel, { key: "Tab" })).toBe(true);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
  });

  it("tells assistive tech the feeling and its angle", () => {
    render(<FeelingWheel point={{ x: 1, y: 1 }} onMove={() => {}} />);
    const wheel = screen.getByRole("slider");
    expect(wheel.getAttribute("aria-valuetext")).toBe("playful, a little joyful");
    expect(wheel.getAttribute("aria-valuenow")).toBe("45");
    cleanup();
    render(<FeelingWheel point={{ x: 0, y: -1 }} onMove={() => {}} />);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("wistful");
    expect(screen.getByRole("slider").getAttribute("aria-valuenow")).toBe("270");
  });

  it("works with no gesture listener, as on the Threshold", () => {
    const onMove = vi.fn();
    render(<FeelingWheel point={{ x: 0, y: 0 }} onMove={onMove} />);
    const wheel = screen.getByRole("slider");
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(wheel);
    fireEvent.keyDown(wheel, { key: "ArrowUp" });
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it("captures the pointer so a drag that leaves the wheel keeps moving the point", () => {
    const capture = vi.spyOn(HTMLElement.prototype, "setPointerCapture");
    const { wheel } = setup();
    fireEvent.pointerDown(wheel, { pointerId: 7, clientX: 100, clientY: 100 });
    expect(capture).toHaveBeenCalledWith(7);
    capture.mockRestore();
  });

  it("adds the caller's class and no stray text to the class list", () => {
    render(<FeelingWheel point={{ x: 0, y: 0 }} onMove={() => {}} className="mine" />);
    const wheel = screen.getByRole("slider");
    expect(wheel.classList).toContain("mine");
    expect(wheel.className).not.toMatch(/undefined|Stryker/);
    cleanup();
    render(<FeelingWheel point={{ x: 0, y: 0 }} onMove={() => {}} />);
    expect(screen.getByRole("slider").className.split(" ").filter(Boolean)).toHaveLength(3);
  });
});
