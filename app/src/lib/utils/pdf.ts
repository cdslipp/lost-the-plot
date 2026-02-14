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
			scale: 4,
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
	doc.text(new Date().toISOString().split('T')[0], pageWidth - margin, margin + 18, {
		align: 'right'
	});
	doc.setDrawColor(200);
	doc.line(margin, margin + headerHeight - 6, pageWidth - margin, margin + headerHeight - 6);

	// Determine if there's input list content to show below the plot
	const inputItems = items.filter((i) => i.channel);
	const hasInputContent = inputItems.length > 0 || persons.length > 0;

	// Scale canvas image to fit available width, reserving space for input list
	const imgData = canvas.toDataURL('image/png');
	const availableWidth = pageWidth - margin * 2;
	const totalAvailableHeight = pageHeight - margin * 2 - headerHeight;
	const minInputListSpace = hasInputContent ? 200 : 0;
	const maxImageHeight = totalAvailableHeight - minInputListSpace;

	const widthScale = availableWidth / canvas.width;
	const heightScale = maxImageHeight / canvas.height;
	const scale = Math.min(widthScale, heightScale);
	const finalWidth = canvas.width * scale;
	const finalHeight = canvas.height * scale;

	// Top-align below header, center horizontally
	const imgX = margin + (availableWidth - finalWidth) / 2;
	const imgY = margin + headerHeight;

	doc.addImage(imgData, 'PNG', imgX, imgY, finalWidth, finalHeight);

	// Input list below the plot on the same page
	if (hasInputContent) {
		let y = imgY + finalHeight + 16;

		// If almost no space remains, start a new page
		if (y > pageHeight - margin - 60) {
			doc.addPage(pageFormat, 'portrait');
			y = margin + 16;
		}

		if (inputItems.length > 0) {
			// Input List header
			doc.setFontSize(14);
			doc.setFont('helvetica', 'bold');
			doc.text('Input List', margin, y);
			y += 16;

			// Table header
			doc.setFontSize(9);
			doc.setFont('helvetica', 'bold');
			const colCh = margin;
			const colName = margin + 40;
			const colPerson = margin + Math.round(availableWidth * 0.55);

			doc.text('Ch', colCh, y);
			doc.text('Input', colName, y);
			doc.text('Person', colPerson, y);
			y += 4;
			doc.setDrawColor(180);
			doc.line(margin, y, pageWidth - margin, y);
			y += 10;

			// Table rows
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(9);
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
				y += 13;
			}
		}

		// People section
		if (persons.length > 0) {
			y += 6;
			if (y > pageHeight - margin - 30) {
				doc.addPage(pageFormat, 'portrait');
				y = margin + 16;
			}
			doc.setFontSize(12);
			doc.setFont('helvetica', 'bold');
			doc.text('People', margin, y);
			y += 14;

			doc.setFontSize(9);
			doc.setFont('helvetica', 'normal');
			for (const p of persons) {
				if (y > pageHeight - margin) {
					doc.addPage(pageFormat, 'portrait');
					y = margin + 16;
				}
				doc.text(`${p.name}${p.role ? ' — ' + p.role : ''}`, margin, y);
				y += 13;
			}
		}
	}

	// Save via shared helper
	downloadPdfBlob(doc, plotName || 'stage-plot');
}

/**
 * Manual blob download so repeated exports work without a page refresh.
 * jsPDF's built-in save() leaks blob URLs and browsers suppress repeated
 * downloads of the same filename; creating + revoking our own URL avoids both.
 */
function downloadPdfBlob(doc: jsPDF, name: string) {
	const filename = name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
	const blob = doc.output('blob');
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${filename}.pdf`;
	document.body.appendChild(a);
	a.click();
	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 100);
}

interface SetlistPdfOptions {
	title: string;
	sheets: HTMLElement[];
	pageFormat?: 'letter' | 'a4';
}

export async function exportSetlistToPdf({
	title,
	sheets,
	pageFormat = 'letter'
}: SetlistPdfOptions) {
	if (sheets.length === 0) return;

	// Capture each sheet as a canvas image
	const captures: HTMLCanvasElement[] = [];
	for (const sheet of sheets) {
		const canvas = await html2canvas(sheet, {
			scale: 2,
			useCORS: true,
			backgroundColor: '#ffffff',
			logging: false,
			onclone: (clonedDoc, clonedEl) => {
				// Hide interactive UI elements in the clone
				const selectors = [
					'.drag-handle',
					'.delete-btn',
					'.add-prompt',
					'.setlist-header-btn',
					'.delete-set-btn',
					'.add-set-btn'
				];
				for (const sel of selectors) {
					for (const el of clonedEl.querySelectorAll(sel)) {
						(el as HTMLElement).style.display = 'none';
					}
				}
				// Also hide anything marked print:hidden
				for (const el of clonedDoc.querySelectorAll('.print\\:hidden, [class*="print:hidden"]')) {
					(el as HTMLElement).style.display = 'none';
				}
			}
		});
		captures.push(canvas);
	}

	// Create PDF
	const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: pageFormat });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 28;

	for (let i = 0; i < captures.length; i++) {
		if (i > 0) doc.addPage(pageFormat, 'portrait');

		const canvas = captures[i];
		const imgData = canvas.toDataURL('image/png');

		const availableWidth = pageWidth - margin * 2;
		const availableHeight = pageHeight - margin * 2;

		const widthScale = availableWidth / canvas.width;
		const heightScale = availableHeight / canvas.height;
		const scale = Math.min(widthScale, heightScale);
		const finalWidth = canvas.width * scale;
		const finalHeight = canvas.height * scale;

		// Center on page
		const imgX = margin + (availableWidth - finalWidth) / 2;
		const imgY = margin + (availableHeight - finalHeight) / 2;

		doc.addImage(imgData, 'PNG', imgX, imgY, finalWidth, finalHeight);
	}

	downloadPdfBlob(doc, title || 'setlist');
}
