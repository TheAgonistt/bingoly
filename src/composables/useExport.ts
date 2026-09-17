import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { ImageFormat } from '@/types/bingo';

function downloadBlob(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function useExport() {
  async function exportAsImage(
    element: HTMLElement,
    format: ImageFormat,
    filename = 'bingo-card',
  ): Promise<void> {
    const options = {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#ffffff',
    };

    let dataUrl: string;
    if (format === 'jpeg') {
      dataUrl = await toJpeg(element, { ...options, quality: 0.95 });
    } else {
      dataUrl = await toPng(element, options);
    }

    downloadBlob(dataUrl, `${filename}.${format === 'jpeg' ? 'jpg' : 'png'}`);
  }

  async function exportAsPdf(
    element: HTMLElement,
    title = 'bingo-card',
  ): Promise<void> {
    // Capture as PNG first
    const dataUrl = await toPng(element, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });

    // Create PDF — Letter size (215.9mm × 279.4mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; // mm

    const availW = pageWidth - margin * 2;
    const availH = pageHeight - margin * 2;

    // Determine image dimensions from the element's aspect ratio
    const aspectRatio = element.offsetWidth / element.offsetHeight;
    let imgW: number;
    let imgH: number;

    if (aspectRatio >= 1) {
      imgW = availW;
      imgH = availW / aspectRatio;
      if (imgH > availH) {
        imgH = availH;
        imgW = availH * aspectRatio;
      }
    } else {
      imgH = availH;
      imgW = availH * aspectRatio;
      if (imgW > availW) {
        imgW = availW;
        imgH = availW / aspectRatio;
      }
    }

    // Centre on page
    const x = (pageWidth - imgW) / 2;
    const y = (pageHeight - imgH) / 2;

    pdf.addImage(dataUrl, 'PNG', x, y, imgW, imgH);
    pdf.save(`${title}.pdf`);
  }

  return { exportAsImage, exportAsPdf };
}
