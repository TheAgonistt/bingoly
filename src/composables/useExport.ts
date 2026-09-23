import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
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
    count = 1,
    shuffleCallback?: () => Promise<void>
  ): Promise<void> {
    const options = {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#ffffff',
    };

    if (count <= 1 || !shuffleCallback) {
      let dataUrl: string;
      if (format === 'jpeg') {
        dataUrl = await toJpeg(element, { ...options, quality: 0.95 });
      } else {
        dataUrl = await toPng(element, options);
      }
      downloadBlob(dataUrl, `${filename}.${format === 'jpeg' ? 'jpg' : 'png'}`);
      return;
    }

    const zip = new JSZip();
    for (let i = 0; i < count; i++) {
      if (i > 0) await shuffleCallback();
      
      let dataUrl: string;
      if (format === 'jpeg') {
        dataUrl = await toJpeg(element, { ...options, quality: 0.95 });
      } else {
        dataUrl = await toPng(element, options);
      }
      
      const base64Data = dataUrl.split(',')[1];
      zip.file(`${filename}-${i + 1}.${format === 'jpeg' ? 'jpg' : 'png'}`, base64Data!, { base64: true });
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    downloadBlob(url, `${filename}-bundle.zip`);
    URL.revokeObjectURL(url);
  }

  async function exportAsPdf(
    element: HTMLElement,
    title = 'bingo-card',
    count = 1,
    shuffleCallback?: () => Promise<void>
  ): Promise<void> {
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

    for (let i = 0; i < count; i++) {
      if (i > 0) {
        await shuffleCallback?.();
        pdf.addPage();
      }

      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });

      const props = pdf.getImageProperties(dataUrl);
      const imgRatio = props.width / props.height;
      const pageRatio = availW / availH;

      let finalW = availW;
      let finalH = availH;

      if (imgRatio > pageRatio) {
        finalH = availW / imgRatio;
      } else {
        finalW = availH * imgRatio;
      }

      const x = margin + (availW - finalW) / 2;
      const y = margin + (availH - finalH) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, finalW, finalH);
    }

    pdf.save(`${title}.pdf`);
  }

  return {
    exportAsImage,
    exportAsPdf,
  };
}
