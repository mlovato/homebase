/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShortcutRecorder } from "./ShortcutRecorder";

describe("ShortcutRecorder", () => {
  it("displays the current shortcut", () => {
    render(<ShortcutRecorder value="mod+k" onChange={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("⌘K / Ctrl K");
  });

  it("displays single-key shortcut", () => {
    render(<ShortcutRecorder value="/" onChange={jest.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("/");
  });

  it("shows recording prompt on click", () => {
    render(<ShortcutRecorder value="mod+k" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent(/press/i);
  });

  it("captures mod+key combo and calls onChange", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("button"), { key: "s", metaKey: true });
    expect(onChange).toHaveBeenCalledWith("mod+s");
  });

  it("captures single key and calls onChange", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("button"), { key: "/" });
    expect(onChange).toHaveBeenCalledWith("/");
  });

  it("cancels on Escape without calling onChange", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveTextContent("⌘K / Ctrl K");
  });

  it("ignores modifier-only keypresses", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("button"), { key: "Meta" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveTextContent(/press/i);
  });

  it("exits recording mode after capturing a combo", () => {
    render(<ShortcutRecorder value="mod+k" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("button"), { key: "p", metaKey: true });
    expect(screen.getByRole("button")).not.toHaveTextContent(/press/i);
  });
});

describe("unrepresentable modifiers", () => {
  function startRecording() {
    const button = screen.getByRole("button");
    fireEvent.click(button);
    return button;
  }

  // The stored format is `mod+<char>`, with nowhere to put Shift or Alt.
  // Accepting them bound the un-shifted combination instead, so recording
  // Cmd+Shift+F silently took over Cmd+F.
  it("refuses a Shift combination instead of binding the unshifted one", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    const button = startRecording();

    fireEvent.keyDown(button, { key: "F", metaKey: true, shiftKey: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(button).toHaveTextContent("Unsupported key");
  });

  // Every one of ~!@#$%^&*() needs Shift on a US layout, and the validator
  // accepts them — so rejecting Shift wholesale would make the recorder unable
  // to produce characters the API still takes.
  it.each([
    ["!", "!"],
    ["@", "@"],
    ["#", "#"],
    ["~", "~"],
  ])("still records the shifted punctuation %s", (_label, key) => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    const button = startRecording();

    fireEvent.keyDown(button, { key, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith(key);
  });

  it("records a shifted punctuation key with a modifier too", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    const button = startRecording();

    fireEvent.keyDown(button, { key: "/", metaKey: true, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith("mod+/");
  });

  it("refuses an Alt combination", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    const button = startRecording();

    fireEvent.keyDown(button, { key: "s", altKey: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(button).toHaveTextContent("Unsupported key");
  });

  it("says so instead of pulsing forever on a key it cannot store", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    const button = startRecording();

    fireEvent.keyDown(button, { key: "F2" });

    expect(onChange).not.toHaveBeenCalled();
    expect(button).toHaveTextContent("Unsupported key");
  });

  it("refuses the space bar, which renders as a blank label", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    const button = startRecording();

    fireEvent.keyDown(button, { key: " " });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("still records a supported combination after a rejected one", () => {
    const onChange = jest.fn();
    render(<ShortcutRecorder value="mod+k" onChange={onChange} />);
    const button = startRecording();

    fireEvent.keyDown(button, { key: "F2" });
    fireEvent.keyDown(button, { key: "j", metaKey: true });

    expect(onChange).toHaveBeenCalledWith("mod+j");
  });
});
