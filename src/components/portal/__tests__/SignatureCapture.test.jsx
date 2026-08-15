import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  uploadPrivateFile: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    functions: { invoke: mocks.invoke },
    integrations: { Core: { UploadPrivateFile: mocks.uploadPrivateFile } },
  },
}));

import SignatureCapture from "@/components/portal/SignatureCapture";

function renderSignature(onSigned = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SignatureCapture
        job={{ id: "job-1", customer_id: "customer-1", customer_name: "Jamie Rider" }}
        signatureKey="completed-work"
        title="Acknowledge completed work"
        description="Confirm the completed repair work."
        fileName="completed-work-signature-job-1.png"
        onSigned={onSigned}
      />
    </QueryClientProvider>,
  );
  return onSigned;
}

describe("SignatureCapture", () => {
  beforeEach(() => {
    mocks.invoke.mockReset().mockImplementation((_name, payload) => {
      if (payload?.action === "list") return Promise.resolve({ data: { data: { items: [] } } });
      if (payload?.action === "finalize") return Promise.resolve({ data: { data: { attachment: { id: "signature-1" } } } });
      return Promise.reject(new Error(`Unexpected attachment action: ${payload?.action}`));
    });
    mocks.uploadPrivateFile.mockReset().mockResolvedValue({ file_uri: "private://signature.txt" });
  });

  it("provides a keyboard-accessible typed signature with consent metadata", async () => {
    const user = userEvent.setup();
    const onSigned = renderSignature();

    await user.click(await screen.findByRole("tab", { name: "Type" }));
    await user.type(screen.getByLabelText("Full legal name"), "Jamie Rider");
    await user.click(screen.getByLabelText(/I confirm this signature is mine/i));
    await user.click(screen.getByRole("button", { name: "Save signature" }));

    await waitFor(() => expect(onSigned).toHaveBeenCalledWith("signature-1"));
    expect(mocks.uploadPrivateFile).toHaveBeenCalledWith({ file: expect.objectContaining({ name: "completed-work-signature-job-1-typed.txt", type: "text/plain" }) });
    expect(mocks.invoke).toHaveBeenCalledWith("attachmentActions", expect.objectContaining({
      action: "finalize",
      file_uri: "private://signature.txt",
      signature_key: "completed-work",
      signature_idempotency_key: "job-1:completed-work",
      signature_method: "typed",
      signed_name: "Jamie Rider",
      consent_version: "completed-work-v1",
    }));
    expect(onSigned).toHaveBeenCalledWith("signature-1");
  });

  it("clears the saving guard and presents a safe retryable error", async () => {
    const user = userEvent.setup();
    mocks.uploadPrivateFile.mockRejectedValue({ response: { status: 500, data: { error: "secret backend detail" } } });
    renderSignature();

    await user.click(await screen.findByRole("tab", { name: "Type" }));
    await user.type(screen.getByLabelText("Full legal name"), "Jamie Rider");
    await user.click(screen.getByLabelText(/I confirm this signature is mine/i));
    await user.click(screen.getByRole("button", { name: "Save signature" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your signature could not be saved");
    expect(screen.getByRole("button", { name: "Save signature" })).toBeEnabled();
    expect(screen.queryByText("secret backend detail")).not.toBeInTheDocument();
  });
});
