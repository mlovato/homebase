import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    title: "Delete item?",
    message: "This action cannot be undone.",
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} open={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title and message when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
  });

  it("renders confirm and cancel buttons", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when clicking the overlay", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const overlay = screen.getByTestId("confirm-overlay");
    fireEvent.click(overlay);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancel when clicking inside the dialog", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete item?"));
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it("uses custom confirmLabel when provided", () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Yes, continue" />);
    expect(
      screen.getByRole("button", { name: "Yes, continue" }),
    ).toBeInTheDocument();
  });

  it("uses custom cancelLabel when provided", () => {
    render(<ConfirmDialog {...defaultProps} cancelLabel="Go back" />);
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });
});
