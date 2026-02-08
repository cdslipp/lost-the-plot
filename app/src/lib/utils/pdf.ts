import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface PdfExportOptions {
	plotName: string;
	canvasEl: HTMLElement;
	items: Array<{ name: string; channel: string; person_name: string }>;
	persons: Array<{ name: string; role: string }>;
	pageFormat?: 'letter' | 'a4';
}

export async function exportToPdf({
	plotName,
	canvasEl,
	items,
	persons,
	pageFormat = 'letter'
}: PdfExportOptions) {
	const exportAttr = 'data-pdf-export-root';
	canvasEl.setAttribute(exportAttr, 'true');

	let canvas: HTMLCanvasElement;
	try {
		// Capture canvas as image
		canvas = await html2canvas(canvasEl, {
			scale: 2,
			useCORS: true,
			backgroundColor: '#ffffff',
			logging: false,
			onclone: (clonedDoc) => {
				const root = clonedDoc.querySelector(`[${exportAttr}]`) as HTMLElement | null;
				if (root) {
					root.classList.add('pdf-export-root');
				}
				const style = clonedDoc.createElement('style');
				style.textContent = `
					.pdf-export-root,
					.pdf-export-root * {
						color: #111111 !important;
						background-color: transparent !important;
						border-color: #d6d3d1 !important;
						outline-color: #d6d3d1 !important;
						box-shadow: none !important;
						text-shadow: none !important;
					}
					.pdf-export-root {
						background-color: #ffffff !important;
					}
				`;
				clonedDoc.head.appendChild(style);
			}
		});
	} finally {
		canvasEl.removeAttribute(exportAttr);
	}

	// Create portrait PDF
	const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: pageFormat });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 28;
	const headerHeight = 44;

	// Header
	const titleText = plotName || 'Untitled Plot';
	doc.setFontSize(20);
	doc.setFont('helvetica', 'bold');
	doc.text(titleText, margin, margin + 18);

	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	doc.text('Stage Plot', margin, margin + 34);
	doc.text(new Date().toISOString().split('T')[0], pageWidth - margin, margin + 18, { align: 'right' });
	doc.setDrawColor(200);
	doc.line(margin, margin + headerHeight - 6, pageWidth - margin, margin + headerHeight - 6);

	// Add canvas image — fit to available width and height
	const imgData = canvas.toDataURL('image/png');
	const availableWidth = pageWidth - margin * 2;
	const availableHeight = pageHeight - margin * 2 - headerHeight + 4;
	const widthScale = availableWidth / canvas.width;
	const heightScale = availableHeight / canvas.height;
	const scale = Math.min(widthScale, heightScale);
	const finalWidth = canvas.width * scale;
	const finalHeight = canvas.height * scale;

	const imgX = margin + (availableWidth - finalWidth) / 2;
	const imgY = margin + headerHeight + (availableHeight - finalHeight) / 2;

	doc.addImage(imgData, 'PNG', imgX, imgY, finalWidth, finalHeight);

	// Input list on page 2
	const inputItems = items.filter((i) => i.channel);
	if (inputItems.length > 0 || persons.length > 0) {
		doc.addPage(pageFormat, 'portrait');

		let y = margin + 16;

		// Input List header
		doc.setFontSize(18);
		doc.setFont('helvetica', 'bold');
		doc.text('Input List', margin, y);
		y += 20;

		// Table header
		doc.setFontSize(11);
		doc.setFont('helvetica', 'bold');
		const colCh = margin;
		const colName = margin + 60;
		const colPerson = margin + Math.round(availableWidth * 0.55);

		doc.text('Ch', colCh, y);
		doc.text('Input', colName, y);
		doc.text('Person', colPerson, y);
		y += 6;
		doc.setDrawColor(180);
		doc.line(margin, y, pageWidth - margin, y);
		y += 14;

		// Table rows
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(11);
		const sortedItems = [...inputItems].sort(
			(a, b) => parseInt(a.channel || '0') - parseInt(b.channel || '0')
		);
		for (const item of sortedItems) {
			if (y > pageHeight - margin) {
				doc.addPage(pageFormat, 'portrait');
				y = margin + 16;
			}
			doc.text(item.channel, colCh, y);
			doc.text(item.name || '', colName, y);
			doc.text(item.person_name || '', colPerson, y);
			y += 16;
		}

		// People section
		if (persons.length > 0) {
			y += 8;
			if (y > pageHeight - margin - 30) {
				doc.addPage(pageFormat, 'portrait');
				y = margin + 16;
			}
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text('People', margin, y);
			y += 18;

			doc.setFontSize(11);
			doc.setFont('helvetica', 'normal');
			for (const p of persons) {
				if (y > pageHeight - margin) {
					doc.addPage(pageFormat, 'portrait');
					y = margin + 16;
				}
				doc.text(`${p.name}${p.role ? ' — ' + p.role : ''}`, margin, y);
				y += 16;
			}
		}
	}

	// Save
	const filename = (plotName || 'stage-plot').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
	doc.save(`${filename}.pdf`);
}
