import jsPDF from 'jspdf';

interface OrderItem {
  quantity: number;
  price: number;
  menu_item: {
    name: string;
  };
}

interface ReceiptData {
  restaurantName: string;
  orderId: string;
  orderDate: string;
  tableNumber?: number;
  orderType: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentReference?: string;
  orderItems: OrderItem[];
  totalAmount: number;
  note?: string;
}

export function generateReceiptPDF(data: ReceiptData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y, { align });
    return lines.length * (fontSize * 0.4);
  };

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.restaurantName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Order Receipt', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Order Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const orderInfo = [
    { label: 'Order Number:', value: `#${data.orderId.slice(0, 8).toUpperCase()}` },
    { label: 'Date & Time:', value: new Date(data.orderDate).toLocaleString() },
    ...(data.tableNumber ? [{ label: 'Table:', value: `Table ${data.tableNumber}` }] : []),
    { label: 'Order Type:', value: data.orderType.replace('_', ' ').toUpperCase() },
  ];

  orderInfo.forEach((info, index) => {
    if (index % 2 === 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(info.label, margin, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(info.value, margin + 50, yPos);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(info.label, pageWidth / 2, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(info.value, pageWidth / 2 + 50, yPos);
      yPos += 7;
    }
  });

  if (orderInfo.length % 2 !== 0) {
    yPos += 7;
  }

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Order Items
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Items', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  data.orderItems.forEach((item) => {
    const itemName = `${item.quantity}x ${item.menu_item.name}`;
    const itemTotal = item.quantity * item.price;
    const formattedTotal = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(itemTotal);

    doc.setFont('helvetica', 'bold');
    const nameHeight = addText(itemName, margin, yPos, contentWidth - 60, 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`₦${item.price.toLocaleString()} each`, margin + 5, yPos + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(formattedTotal, pageWidth - margin, yPos, { align: 'right' });
    
    yPos += Math.max(nameHeight, 8) + 3;

    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = margin;
    }
  });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Special Instructions
  if (data.note) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, contentWidth, 15, 'F');
    doc.text('Special Instructions:', margin + 5, yPos);
    yPos += 5;
    const noteHeight = addText(data.note, margin + 5, yPos, contentWidth - 10, 9);
    yPos += noteHeight + 10;
  }

  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const totalFormatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.totalAmount);

  doc.text('TOTAL', margin, yPos);
  doc.text(totalFormatted, pageWidth - margin, yPos, { align: 'right' });
  yPos += 15;

  // Customer Information
  if (data.customerName || data.customerEmail || data.customerPhone) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', margin, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    if (data.customerName) {
      doc.text(`Name: ${data.customerName}`, margin, yPos);
      yPos += 6;
    }
    if (data.customerEmail) {
      doc.text(`Email: ${data.customerEmail}`, margin, yPos);
      yPos += 6;
    }
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, margin, yPos);
      yPos += 6;
    }
    yPos += 5;
  }

  // Payment Reference
  if (data.paymentReference) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Reference: ${data.paymentReference}`, margin, yPos);
    yPos += 10;
  }

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your order!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });

  // Save the PDF
  const fileName = `receipt-${data.orderId.slice(0, 8).toUpperCase()}.pdf`;
  doc.save(fileName);
}

