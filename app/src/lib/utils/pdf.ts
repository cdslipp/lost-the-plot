import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface PdfExportOptions {
	plotName: string;
	canvasEl: HTMLElement;
	items: Array<{ name: string; channel: string; musician: string }>;
	musicians: Array<{ name: string; instrument: string }>;
}

export async function exportToPdf({ plotName, canvasEl, items, musicians }: PdfExportOptions) {
	// Capture canvas as image
	const canvas = await html2canvas(canvasEl, {
		scale: 2,
		useCORS: true,
		backgroundColor: null,
		logging: false
	});

	// Create landscape letter PDF (792 x 612 pts)
	const doc = new jsPDF('landscape', 'pt', 'letter');
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 30;

	// Title
	doc.setFontSize(18);
	doc.setFont('helvetica', 'bold');
	doc.text(plotName || 'Untitled Plot', margin, margin + 14);

	// Date
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.text(new Date().toLocaleDateString(), pageWidth - margin, margin + 14, { align: 'right' });

	// Add canvas image — fit to available width with aspect ratio
	const imgData = canvas.toDataURL('image/png');
	const availableWidth = pageWidth - margin * 2;
	const aspectRatio = canvas.height / canvas.width;
	const imgWidth = availableWidth;
	const imgHeight = imgWidth * aspectRatio;
	const maxImgHeight = pageHeight - margin * 2 - 40; // leave room for title and bottom
	const finalHeight = Math.min(imgHeight, maxImgHeight);
	const finalWidth = imgHeight > maxImgHeight ? finalHeight / aspectRatio : imgWidth;

	const imgX = margin + (availableWidth - finalWidth) / 2;
	const imgY = margin + 24;

	doc.addImage(imgData, 'PNG', imgX, imgY, finalWidth, finalHeight);

	// Input list on page 2
	const inputItems = items.filter((i) => i.channel);
	if (inputItems.length > 0 || musicians.length > 0) {
		doc.addPage('letter', 'landscape');

		let y = margin + 14;

		// Input List header
		doc.setFontSize(14);
		doc.setFont('helvetica', 'bold');
		doc.text('Input List', margin, y);
		y += 20;

		// Table header
		doc.setFontSize(9);
		doc.setFont('helvetica', 'bold');
		const colCh = margin;
		const colName = margin + 40;
		const colMusician = margin + 240;

		doc.text('Ch', colCh, y);
		doc.text('Input', colName, y);
		doc.text('Musician', colMusician, y);
		y += 4;
		doc.setDrawColor(180);
		doc.line(margin, y, pageWidth - margin, y);
		y += 12;

		// Table rows
		doc.setFont('helvetica', 'normal');
		const sortedItems = [...inputItems].sort(
			(a, b) => parseInt(a.channel || '0') - parseInt(b.channel || '0')
		);
		for (const item of sortedItems) {
			if (y > pageHeight - margin) {
				doc.addPage('letter', 'landscape');
				y = margin + 14;
			}
			doc.text(item.channel, colCh, y);
			doc.text(item.name || '', colName, y);
			doc.text(item.musician || '', colMusician, y);
			y += 14;
		}

		// Musicians section
		if (musicians.length > 0) {
			y += 10;
			if (y > pageHeight - margin - 30) {
				doc.addPage('letter', 'landscape');
				y = margin + 14;
			}
			doc.setFontSize(14);
			doc.setFont('helvetica', 'bold');
			doc.text('Musicians', margin, y);
			y += 20;

			doc.setFontSize(9);
			doc.setFont('helvetica', 'normal');
			for (const m of musicians) {
				if (y > pageHeight - margin) {
					doc.addPage('letter', 'landscape');
					y = margin + 14;
				}
				doc.text(`${m.name}${m.instrument ? ' — ' + m.instrument : ''}`, margin, y);
				y += 14;
			}
		}
	}

	// Save
	const filename = (plotName || 'stage-plot').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
	doc.save(`${filename}.pdf`);
}
