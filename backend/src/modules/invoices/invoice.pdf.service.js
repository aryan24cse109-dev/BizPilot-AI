
import PDFDocument from "pdfkit";
import { ApiError } from "../../utils/ApiError.js";

function formatMoney(currency, amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${amount}`;
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
}

function formatDate(date) {
  if (!date) return "Not specified";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function generateInvoicePdf(res, invoice) {
  try {
    const business = invoice.businessUser?.businessProfile;

    if (!business) {
      throw new ApiError(404, "Business profile not found.");
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 45,
      bufferPages: true,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: business.businessName,
        Subject: "Business invoice",
      },
    });

    const filename = `${invoice.invoiceNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );

    doc.on("error", (error) => {
      console.error("Invoice PDF generation error:", error);

      if (!res.headersSent) {
        res.status(500).end("Unable to generate invoice PDF.");
      } else {
        res.destroy(error);
      }
    });

    doc.pipe(res);

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("INVOICE", { align: "right" });

    doc.moveDown(1);

    doc.fontSize(15).font("Helvetica-Bold").text(business.businessName);

    doc.fontSize(9).font("Helvetica");

    if (business.legalName) doc.text(business.legalName);
    if (business.businessEmail) doc.text(business.businessEmail);
    if (business.phone) doc.text(business.phone);

    const address = [
      business.addressLine1,
      business.addressLine2,
      business.city,
      business.state,
      business.postalCode,
      business.country,
    ].filter(Boolean).join(", ");

    if (address) doc.text(address);
    if (business.gstin) doc.text(`GSTIN: ${business.gstin}`);

    doc.moveDown(1);

    doc.fontSize(11).font("Helvetica-Bold").text("Invoice details");
    doc.fontSize(9).font("Helvetica");

    doc.text(`Invoice number: ${invoice.invoiceNumber}`);
    doc.text(`Issue date: ${formatDate(invoice.issueDate)}`);
    doc.text(`Due date: ${formatDate(invoice.dueDate)}`);
    doc.text(`Status: ${invoice.status}`);

    doc.moveDown(1);

    doc.font("Helvetica-Bold").text("Bill to");
    doc.font("Helvetica");
    doc.text(invoice.clientName);
    doc.text(invoice.clientEmail);

    doc.moveDown(1);

    const tableTop = doc.y;
    const columns = {
      description: 45,
      quantity: 290,
      price: 355,
      tax: 430,
      total: 490,
    };

    doc.font("Helvetica-Bold").fontSize(8);

    doc.text("Description", columns.description, tableTop);
    doc.text("Qty", columns.quantity, tableTop);
    doc.text("Unit price", columns.price, tableTop);
    doc.text("Tax", columns.tax, tableTop);
    doc.text("Total", columns.total, tableTop);

    doc.moveTo(45, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    let y = tableTop + 23;

    doc.font("Helvetica").fontSize(8);

    for (const item of invoice.items) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(item.description, columns.description, y, {
        width: 235,
      });

      doc.text(item.quantity.toString(), columns.quantity, y);
      doc.text(
        formatMoney(invoice.currency, item.unitPrice),
        columns.price,
        y,
      );
      doc.text(`${item.taxRate.toString()}%`, columns.tax, y);
      doc.text(
        formatMoney(invoice.currency, item.lineTotal),
        columns.total,
        y,
      );

      y += 35;
    }

    y = Math.max(y + 10, doc.y + 10);

    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    doc.moveTo(330, y)
      .lineTo(550, y)
      .stroke();

    y += 12;

    const addTotalRow = (label, value, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica");
      doc.text(label, 350, y, { width: 100 });
      doc.text(value, 450, y, {
        width: 100,
        align: "right",
      });
      y += 18;
    };

    addTotalRow("Subtotal", formatMoney(invoice.currency, invoice.subtotal));
    addTotalRow("Tax", formatMoney(invoice.currency, invoice.taxAmount));
    addTotalRow("Discount", formatMoney(invoice.currency, invoice.discountAmount));
    addTotalRow("Total", formatMoney(invoice.currency, invoice.totalAmount), true);
    addTotalRow("Amount paid", formatMoney(invoice.currency, invoice.amountPaid));
    addTotalRow("Balance due", formatMoney(invoice.currency, invoice.balanceDue), true);

    y += 15;

    if (invoice.notes) {
      doc.font("Helvetica-Bold").fontSize(9).text("Notes", 45, y);
      y += 14;
      doc.font("Helvetica").fontSize(9).text(invoice.notes, 45, y, {
        width: 500,
      });
      y = doc.y + 15;
    }

    if (invoice.terms) {
      doc.font("Helvetica-Bold").fontSize(9).text("Terms and conditions", 45, y);
      y += 14;
      doc.font("Helvetica").fontSize(9).text(invoice.terms, 45, y, {
        width: 500,
      });
    }

    doc.end();

    return doc;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(500, "Unable to generate invoice PDF.");
  }
}
