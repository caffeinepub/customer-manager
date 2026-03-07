import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Building2, Printer, X } from "lucide-react";
import { useEffect } from "react";
import type { Customer, Invoice, Settings } from "../backend.d.ts";
import { formatCurrency, formatDate } from "../hooks/useQueries";

const PRINT_STYLE_ID = "invoice-print-styles";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  customer?: Customer | null;
  settings?: Settings | null;
  logoUrl?: string | null;
}

function StatusStamp({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-15deg)",
          border: "4px solid #16a34a",
          borderRadius: "8px",
          padding: "8px 24px",
          color: "#16a34a",
          fontSize: "42px",
          fontWeight: 900,
          letterSpacing: "0.15em",
          opacity: 0.18,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          zIndex: 0,
        }}
      >
        PAID IN FULL
      </div>
    );
  }
  if (status === "void") {
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-15deg)",
          border: "4px solid #dc2626",
          borderRadius: "8px",
          padding: "8px 24px",
          color: "#dc2626",
          fontSize: "42px",
          fontWeight: 900,
          letterSpacing: "0.15em",
          opacity: 0.18,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          zIndex: 0,
        }}
      >
        VOID
      </div>
    );
  }
  return null;
}

function statusColor(status: string): string {
  switch (status) {
    case "paid":
      return "#16a34a";
    case "overdue":
      return "#dc2626";
    case "sent":
    case "viewed":
      return "#2563eb";
    case "void":
      return "#6b7280";
    default:
      return "#9ca3af";
  }
}

export function InvoicePreviewModal({
  open,
  onClose,
  invoice,
  customer,
  settings,
  logoUrl,
}: Props) {
  // Inject print styles
  useEffect(() => {
    if (!open) return;

    let styleEl = document.getElementById(PRINT_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = PRINT_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        body > * { display: none !important; }
        #invoice-print-root { display: block !important; }
        .no-print { display: none !important; }
        @page { margin: 0.75in; }
      }
    `;

    return () => {
      const el = document.getElementById(PRINT_STYLE_ID);
      if (el) el.remove();
    };
  }, [open]);

  function handlePrint() {
    window.print();
  }

  const invoiceNum = invoice.id.slice(0, 8).toUpperCase();
  const companyName = settings?.companyName || "Your Company";
  const companyPhone = settings?.companyPhone || "";
  const companyEmail = settings?.companyEmail || "";
  const companyAddress = settings?.companyAddress || "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col"
        data-ocid="invoices.preview.modal"
      >
        {/* Toolbar — no-print */}
        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Invoice Preview
            </span>
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              #{invoiceNum}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              data-ocid="invoices.preview.print.button"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              data-ocid="invoices.preview.close_button"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable invoice document */}
        <div className="overflow-y-auto flex-1">
          {/* The print root wraps the actual invoice document */}
          <div
            id="invoice-print-root"
            style={{
              background: "#ffffff",
              minHeight: "100%",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              color: "#111827",
            }}
          >
            <div
              style={{
                maxWidth: "680px",
                margin: "0 auto",
                padding: "48px 48px 64px",
                position: "relative",
              }}
            >
              {/* Watermark stamp */}
              <StatusStamp status={invoice.status} />

              {/* ── Header: Company Info + INVOICE title ── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "36px",
                }}
              >
                {/* Company */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{
                          width: "48px",
                          height: "48px",
                          objectFit: "contain",
                          borderRadius: "8px",
                          background: "#f8fafc",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          background: "#1e293b",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Building2 size={18} color="#ffffff" />
                      </div>
                    )}
                    <h1
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#111827",
                        margin: 0,
                        fontFamily: "'Georgia', serif",
                      }}
                    >
                      {companyName}
                    </h1>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      lineHeight: "1.6",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {companyAddress && <div>{companyAddress}</div>}
                    {companyPhone && <div>{companyPhone}</div>}
                    {companyEmail && <div>{companyEmail}</div>}
                  </div>
                </div>

                {/* INVOICE title block */}
                <div style={{ textAlign: "right" }}>
                  <h2
                    style={{
                      fontSize: "36px",
                      fontWeight: 800,
                      color: "#1e293b",
                      letterSpacing: "-0.02em",
                      margin: "0 0 4px 0",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    INVOICE
                  </h2>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "14px",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    #{invoiceNum}
                  </div>
                  {/* Status badge */}
                  <div
                    style={{
                      display: "inline-block",
                      padding: "3px 12px",
                      borderRadius: "20px",
                      border: `1.5px solid ${statusColor(invoice.status)}`,
                      color: statusColor(invoice.status),
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {invoice.status}
                  </div>
                </div>
              </div>

              {/* ── Date Row ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "24px",
                  marginBottom: "32px",
                  padding: "16px 20px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#9ca3af",
                      textTransform: "uppercase" as const,
                      marginBottom: "4px",
                    }}
                  >
                    Issue Date
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    {formatDate(invoice.dateIssued)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#9ca3af",
                      textTransform: "uppercase" as const,
                      marginBottom: "4px",
                    }}
                  >
                    Due Date
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color:
                        invoice.status === "overdue" ? "#dc2626" : "#111827",
                      fontWeight: 600,
                    }}
                  >
                    {formatDate(invoice.dueDate)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#9ca3af",
                      textTransform: "uppercase" as const,
                      marginBottom: "4px",
                    }}
                  >
                    Invoice #
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#111827",
                      fontWeight: 600,
                      fontFamily: "monospace",
                    }}
                  >
                    {invoiceNum}
                  </div>
                </div>
              </div>

              {/* ── Bill To ── */}
              <div style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#9ca3af",
                    textTransform: "uppercase" as const,
                    marginBottom: "8px",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Bill To
                </div>
                <div
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "4px",
                  }}
                >
                  {customer?.name || "—"}
                </div>
                {customer?.email && (
                  <div
                    style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "13px",
                      color: "#6b7280",
                    }}
                  >
                    {customer.email}
                  </div>
                )}
                {customer?.phone && (
                  <div
                    style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "13px",
                      color: "#6b7280",
                    }}
                  >
                    {customer.phone}
                  </div>
                )}
              </div>

              {/* ── Line Items Table ── */}
              <div style={{ marginBottom: "28px" }}>
                {/* Table header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "16px",
                    padding: "10px 16px",
                    background: "#1e293b",
                    borderRadius: "6px 6px 0 0",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    color: "#ffffff",
                  }}
                >
                  <div>Description</div>
                  <div style={{ textAlign: "right", minWidth: "80px" }}>
                    Qty
                  </div>
                  <div style={{ textAlign: "right", minWidth: "100px" }}>
                    Amount
                  </div>
                </div>

                {/* Single services row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "16px",
                    padding: "14px 16px",
                    borderLeft: "1px solid #e2e8f0",
                    borderRight: "1px solid #e2e8f0",
                    borderBottom: "1px solid #e2e8f0",
                    fontFamily: "Arial, sans-serif",
                    background: "#ffffff",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#111827",
                        fontWeight: 500,
                      }}
                    >
                      Professional Services
                    </div>
                    {invoice.jobIds && invoice.jobIds.length > 0 && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          marginTop: "2px",
                        }}
                      >
                        Job{invoice.jobIds.length > 1 ? "s" : ""}:{" "}
                        {invoice.jobIds
                          .map((id) => `#${id.slice(0, 8)}`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: "80px",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    1
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: "100px",
                      fontSize: "14px",
                      color: "#111827",
                      fontWeight: 600,
                      fontFamily: "monospace",
                    }}
                  >
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                </div>

                {/* Totals block */}
                <div
                  style={{
                    borderLeft: "1px solid #e2e8f0",
                    borderRight: "1px solid #e2e8f0",
                    borderBottom: "1px solid #e2e8f0",
                    borderRadius: "0 0 6px 6px",
                    overflow: "hidden",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      padding: "10px 16px",
                      background: "#f8fafc",
                    }}
                  >
                    <div style={{ minWidth: "240px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid #e2e8f0",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        <span>Subtotal</span>
                        <span style={{ fontFamily: "monospace" }}>
                          {formatCurrency(invoice.totalAmount)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "10px 0 4px",
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        <span>Total Due</span>
                        <span style={{ fontFamily: "monospace" }}>
                          {formatCurrency(invoice.totalAmount)}
                        </span>
                      </div>
                      {invoice.status === "paid" && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#16a34a",
                          }}
                        >
                          <span>✓ PAID IN FULL</span>
                          <span style={{ fontFamily: "monospace" }}>
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Notes ── */}
              {invoice.notes && (
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#9ca3af",
                      textTransform: "uppercase" as const,
                      marginBottom: "8px",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Notes
                  </div>
                  <div
                    style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "13px",
                      color: "#374151",
                      lineHeight: "1.6",
                      padding: "12px 16px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {invoice.notes}
                  </div>
                </div>
              )}

              {/* ── Footer ── */}
              <div
                style={{
                  marginTop: "40px",
                  paddingTop: "20px",
                  borderTop: "1px solid #e2e8f0",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "11px",
                  color: "#9ca3af",
                  textAlign: "center" as const,
                }}
              >
                <p>
                  Thank you for your business.
                  {companyEmail && (
                    <> For questions, contact us at {companyEmail}.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
