import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export class PdfService {
  /**
   * Generate invoice PDF as a Buffer
   */
  static async generateInvoicePdf(invoice) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          info: {
            Title: `Invoice ${invoice.invoiceNumber}`,
            Author: invoice.workspace?.name || 'BizPilot AI',
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Colors
        const primaryColor = '#10b981'; // Emerald
        const darkColor = '#0f172a';
        const grayColor = '#64748b';
        const lightBg = '#f8fafc';

        // --- Header Section ---
        doc.rect(40, 40, doc.page.width - 80, 70).fill(lightBg);
        
        doc.fillColor(primaryColor)
          .fontSize(22)
          .font('Helvetica-Bold')
          .text('BIZPILOT AI', 55, 52);

        doc.fillColor(grayColor)
          .fontSize(9)
          .font('Helvetica')
          .text('Intelligent Business Financial Operations', 55, 78);

        // Invoice Number & Status
        doc.fillColor(darkColor)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(`INVOICE`, 400, 52, { align: 'right' });

        doc.fillColor(grayColor)
          .fontSize(10)
          .font('Helvetica')
          .text(`${invoice.invoiceNumber}`, 400, 72, { align: 'right' });

        doc.fillColor(invoice.status === 'PAID' ? '#10b981' : '#f59e0b')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`[ ${invoice.status} ]`, 400, 88, { align: 'right' });

        doc.moveDown(3);

        // --- Business & Client Details ---
        const detailsTop = 130;
        
        // Left Column: Business (From)
        doc.fillColor(darkColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('ISSUED BY:', 45, detailsTop);

        const bp = invoice.workspace?.businessProfile || {};
        doc.fillColor(darkColor)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(bp.businessName || invoice.workspace?.name || 'Business', 45, detailsTop + 16);

        doc.fillColor(grayColor)
          .fontSize(9)
          .font('Helvetica')
          .text(`${bp.email || ''}`, 45, detailsTop + 32)
          .text(`${bp.addressLine1 || ''} ${bp.city || ''} ${bp.state || ''}`, 45, detailsTop + 45)
          .text(bp.taxId ? `GSTIN/Tax ID: ${bp.taxId}` : '', 45, detailsTop + 58);

        // Right Column: Client (Bill To)
        const clientX = 330;
        doc.fillColor(darkColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('BILLED TO:', clientX, detailsTop);

        doc.fillColor(darkColor)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(invoice.client?.name || 'Valued Client', clientX, detailsTop + 16);

        doc.fillColor(grayColor)
          .fontSize(9)
          .font('Helvetica')
          .text(`Email: ${invoice.client?.email || 'N/A'}`, clientX, detailsTop + 32)
          .text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString('en-IN')}`, clientX, detailsTop + 45)
          .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, clientX, detailsTop + 58);

        // Divider
        doc.moveTo(40, 210).lineTo(doc.page.width - 40, 210).strokeColor('#e2e8f0').stroke();

        // --- Line Items Table ---
        const tableTop = 230;
        doc.rect(40, tableTop, doc.page.width - 80, 24).fill('#f1f5f9');

        doc.fillColor(darkColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('DESCRIPTION', 50, tableTop + 7)
          .text('QTY', 340, tableTop + 7, { width: 40, align: 'center' })
          .text('UNIT PRICE', 390, tableTop + 7, { width: 70, align: 'right' })
          .text('AMOUNT', 470, tableTop + 7, { width: 75, align: 'right' });

        let y = tableTop + 30;
        doc.font('Helvetica').fontSize(9).fillColor(darkColor);

        invoice.items.forEach((item, index) => {
          doc.text(item.description, 50, y, { width: 280 });
          doc.text(String(Number(item.quantity)), 340, y, { width: 40, align: 'center' });
          doc.text(`${invoice.currency} ${Number(item.unitPrice).toFixed(2)}`, 390, y, { width: 70, align: 'right' });
          doc.text(`${invoice.currency} ${Number(item.total).toFixed(2)}`, 470, y, { width: 75, align: 'right' });

          y += 24;
          doc.moveTo(40, y - 4).lineTo(doc.page.width - 40, y - 4).strokeColor('#f1f5f9').stroke();
        });

        // --- Summary & Totals ---
        y += 10;
        const summaryX = 350;

        doc.fillColor(grayColor).fontSize(9);
        doc.text('Subtotal:', summaryX, y);
        doc.fillColor(darkColor).text(`${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}`, 470, y, { width: 75, align: 'right' });

        if (Number(invoice.taxRate) > 0) {
          y += 18;
          doc.fillColor(grayColor).text(`Tax (${invoice.taxRate}%):`, summaryX, y);
          doc.fillColor(darkColor).text(`${invoice.currency} ${Number(invoice.taxAmount).toFixed(2)}`, 470, y, { width: 75, align: 'right' });
        }

        if (Number(invoice.discountAmount) > 0) {
          y += 18;
          doc.fillColor(grayColor).text(`Discount (${invoice.discountRate}%):`, summaryX, y);
          doc.fillColor('#10b981').text(`-${invoice.currency} ${Number(invoice.discountAmount).toFixed(2)}`, 470, y, { width: 75, align: 'right' });
        }

        y += 22;
        doc.rect(summaryX - 10, y - 4, doc.page.width - summaryX - 30, 26).fill('#ecfdf5');
        doc.fillColor('#047857').font('Helvetica-Bold').fontSize(11).text('Grand Total:', summaryX, y + 4);
        doc.text(`${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}`, 470, y + 4, { width: 75, align: 'right' });

        y += 32;
        doc.font('Helvetica').fontSize(9).fillColor(grayColor).text('Amount Paid:', summaryX, y);
        doc.fillColor(darkColor).text(`${invoice.currency} ${Number(invoice.paidAmount).toFixed(2)}`, 470, y, { width: 75, align: 'right' });

        y += 18;
        doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(10).text('Balance Due:', summaryX, y);
        doc.fillColor('#b91c1c').text(`${invoice.currency} ${Number(invoice.balanceDue).toFixed(2)}`, 470, y, { width: 75, align: 'right' });

        // --- Payment QR Code & Instructions ---
        const qrY = y - 70 > tableTop + 60 ? y - 70 : tableTop + 80;
        try {
          const qrDataUrl = await QRCode.toDataURL(`https://bizpilot.ai/pay/${invoice.id}`, { margin: 1, width: 90 });
          const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          doc.image(qrBuffer, 50, qrY, { width: 80 });

          doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(8).text('Scan to Pay via BizPilot', 50, qrY + 84);
        } catch (e) {
          // QR generation optional
        }

        // Notes and payment instructions
        const footerY = Math.max(y + 40, qrY + 110);
        if (bp.paymentInstructions || invoice.notes) {
          doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9).text('Payment Instructions & Notes:', 40, footerY);
          doc.fillColor(grayColor).font('Helvetica').fontSize(8).text(
            bp.paymentInstructions || invoice.notes || 'Thank you for your business!',
            40,
            footerY + 14,
            { width: doc.page.width - 80 }
          );
        }

        // Bottom footer
        doc.fillColor('#94a3b8').fontSize(7).text(
          'Generated securely by BizPilot AI — Production-Grade Autonomous Fintech Engine',
          40,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 80 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
