import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmileScanService } from './services/smile-scan.service';
import { SmileScanResponse } from './models/smile-scan-response';
import { InsightsPanelComponent } from './insights-panel/insights-panel.component';
import { CapturePanelComponent } from './capture-panel/capture-panel.component';
import { HistoryDrawerComponent } from './history-drawer/history-drawer.component';
import { CarePlanModalComponent } from './care-plan-modal/care-plan-modal.component';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CapturePanelComponent,
    InsightsPanelComponent,
    HistoryDrawerComponent,
    CarePlanModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  showCaptureOptions = true;

  title = 'Smile IQ';

  externalPatientId = 1;
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;

  loading = false;
  errorMessage: string | null = null;
  result: SmileScanResponse | null = null;
  showHistory = false;   // add this with your other fields
  history: SmileScanResponse[] = [];
  isCarePlanOpen = false;
  private smileScanService = inject(SmileScanService);

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  today = new Date().toLocaleDateString();

  private stream: MediaStream | null = null;
  isCameraActive = false;

  ngAfterViewInit(): void { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.setSelectedFile(file);
  }

  private setSelectedFile(file: File): void {
    this.selectedFile = file;
    this.errorMessage = null;
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = URL.createObjectURL(file);
    this.showCaptureOptions = false; // <-- hide Open Camera / Upload Photo
  }

  resetCapture(): void {
    this.stopCamera();
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
    this.selectedFile = null;
    this.result = null;
    this.errorMessage = null;
    this.loading = false;
    this.showCaptureOptions = true; // show Open Camera / Upload Photo again
  }

  startNewAnalysis(): void {
    this.resetCapture();
  }

  async startCamera(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.errorMessage = 'Camera is not supported in this browser.';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = this.stream;
        this.videoRef.nativeElement.play();
        this.isCameraActive = true;
        this.errorMessage = null;
      }
    } catch {
      this.errorMessage = 'Unable to access the camera.';
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.srcObject = null;
    }
    this.isCameraActive = false;
  }

  capturePhoto(): void {
    if (!this.videoRef?.nativeElement || !this.canvasRef?.nativeElement) return;

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'smile-photo.jpg', { type: 'image/jpeg' });
      this.setSelectedFile(file);
      this.stopCamera();
    }, 'image/jpeg', 0.9);
  }

  submitScan(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please upload or capture a photo first.';
      return;
    }
    if (!this.externalPatientId || this.externalPatientId <= 0) {
      this.errorMessage = 'Please enter a valid patient ID.';
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.result = null;

    this.smileScanService
      .uploadSmileImage(this.externalPatientId, this.selectedFile!)
      .subscribe({
        next: (res) => {
          this.result = res;
          this.loading = false;
          this.loadHistory();           
        },
        error: (err) => {
          console.error('Scan error:', err);
          const msg =
            typeof err?.error === 'string'
              ? err.error
              : err?.error?.message || 'Something went wrong while scanning.';
          this.errorMessage = msg;
          this.loading = false;
        },
      });
  }
  loadHistory(): void {
    if (!this.externalPatientId || this.externalPatientId <= 0) return;
    this.smileScanService.getScanHistory(this.externalPatientId).subscribe({
      next: (items) => {
        this.history = items;
      },
      error: (err) => console.error('History error:', err)
    });
  }
  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.loadHistory();
    }
  }

  closeHistory(): void {
    this.showHistory = false;
  }

  selectHistoryScan(scan: SmileScanResponse, _index?: number): void {
    this.result = scan;
    this.closeHistory();
  }

  openCarePlan(): void {
    if (!this.result) return;
    this.isCarePlanOpen = true;
  }

  closeCarePlan(): void {
    this.isCarePlanOpen = false;
  }

  get totalScore(): number {
    return this.result?.smileScore ?? 0;
  }

  get riskLabel(): string {
    if (!this.result) return '';
    if (this.result.plaqueRiskLevel?.toLowerCase() === 'low') return 'LOW RISK';
    if (this.result.plaqueRiskLevel?.toLowerCase() === 'high') return 'HIGH RISK';
    return 'MEDIUM RISK';
  }

  get riskPercent(): number {
    if (!this.result || !this.result.plaqueRiskLevel) return 0;
    const level = this.result.plaqueRiskLevel.toLowerCase();
    if (level === 'low') return 30;
    if (level === 'medium') return 60;
    if (level === 'high') return 90;
    return 50;
  }

  async downloadReport(): Promise<void> {
    if (!this.result) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    let y = 18;

    // Soft light-gray page background
    doc.setFillColor(244, 247, 251);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // White main card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX - 4, 10, pageWidth - (marginX - 4) * 2, pageHeight - 20, 3, 3, 'FD');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0, 122, 255);
    doc.text('Smile IQ', marginX, y);

    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('Personalized Dental Analysis Report', marginX, y + 7);

    doc.setTextColor(55, 65, 81);
    const headerRightX = pageWidth - marginX;
    doc.setFontSize(10);
    doc.text(this.today, headerRightX, y, { align: 'right' });
    doc.text('Generated by AI', headerRightX, y + 6, { align: 'right' });

    // Divider
    y += 16;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageWidth - marginX, y);

    y += 10;

    // Left: image
    let imgBlockBottom = y;
    if (this.imagePreviewUrl) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = (err) => reject(err);
          image.src = this.imagePreviewUrl as string;
        });

        const maxImgWidth = 70;
        const maxImgHeight = 85;
        const ratio = Math.min(maxImgWidth / img.width, maxImgHeight / img.height);
        const imgWidth = img.width * ratio;
        const imgHeight = img.height * ratio;

        const imgX = marginX;
        const imgY = y;

        // Frame
        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(imgX - 2, imgY - 2, imgWidth + 4, imgHeight + 4, 3, 3, 'FD');

        doc.addImage(
          img,
          'JPEG',
          imgX,
          imgY,
          imgWidth,
          imgHeight
        );

        imgBlockBottom = imgY + imgHeight;
      } catch (err) {
        console.error('Unable to embed image in PDF', err);
        imgBlockBottom = y + 50;
      }
    } else {
      imgBlockBottom = y + 50;
    }

    // Right: score ring (blue/gray ring like UI) + metrics
    const rightX = marginX + 80;
    const centerX = rightX + 32;
    const centerY = y + 28;
    const ringR = 18;
    const ringWidth = 3;
    const innerR = ringR - ringWidth / 2 - 1;
    const riskLower = this.result.plaqueRiskLevel.toLowerCase();

    // Full ring in light gray
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(ringWidth);
    doc.circle(centerX, centerY, ringR, 'S');

    // Blue arc for score (start at bottom, clockwise); jsPDF y increases downward
    const score = Math.min(100, Math.max(0, this.result.smileScore));
    const startAngle = Math.PI / 2; // bottom
    const endAngle = startAngle - (score / 100) * 2 * Math.PI;
    const segments = 40;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(ringWidth);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * (endAngle - startAngle);
      const px = centerX + ringR * Math.cos(angle);
      const py = centerY - ringR * Math.sin(angle);
      if (i === 0) {
        doc.moveTo(px, py);
      } else {
        doc.lineTo(px, py);
      }
    }
    doc.stroke();

    // White inner circle (center of gauge)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.circle(centerX, centerY, innerR, 'F');

    // Score number
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(String(this.result.smileScore), centerX, centerY - 2, { align: 'center' });

    // TOTAL SCORE label
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text('TOTAL SCORE', centerX, centerY + 4, { align: 'center' });

    // Risk badge (pill) below
    const riskLabelPdf = this.riskLabel;
    const badgeY = centerY + 10;
    doc.setFontSize(6);
    const badgeW = doc.getTextWidth(riskLabelPdf) + 4;
    const badgeH = 4;
    const badgeX = centerX - badgeW / 2;
    if (riskLower === 'high') {
      doc.setFillColor(220, 38, 38);
    } else if (riskLower === 'low') {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(234, 179, 8);
    }
    doc.roundedRect(badgeX, badgeY - badgeH / 2, badgeW, badgeH, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(riskLabelPdf, centerX, badgeY + 0.5, { align: 'center' });

    // Metrics block
    const metricStartY = y + 60;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);

    type MetricRow = { label: string; value: string };
    const metrics: MetricRow[] = [
      { label: 'ALIGNMENT', value: `${this.result.alignmentScore}%` },
      { label: 'GUM HEALTH', value: `${this.result.gumHealthScore}%` },
      { label: 'WHITENESS', value: `${this.result.whitenessScore}%` },
      { label: 'SYMMETRY', value: `${this.result.symmetryScore}%` },
      { label: 'AI CONFIDENCE', value: `${(this.result.confidenceScore * 100).toFixed(0)}%` },
      { label: 'RISK LEVEL', value: this.result.plaqueRiskLevel },
    ];

    const colWidth = 42;
    metrics.forEach((m, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = rightX + col * (colWidth + 6);
      const rowY = metricStartY + row * 12;

      doc.setTextColor(107, 114, 128);
      doc.text(m.label, x, rowY);

      // Emphasize values and add color for risk
      if (m.label === 'RISK LEVEL') {
        if (riskLower === 'high') {
          doc.setTextColor(220, 38, 38);
        } else if (riskLower === 'low') {
          doc.setTextColor(22, 163, 74);
        } else {
          doc.setTextColor(234, 179, 8);
        }
      } else {
        doc.setTextColor(37, 99, 235);
      }

      doc.setFontSize(11);
      doc.text(m.value, x, rowY + 5);
      doc.setFontSize(9);
    });

    y = Math.max(imgBlockBottom, metricStartY + 3 * 12) + 16;

    // Personalized Care Plan
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(marginX, y - 6, pageWidth - marginX, y - 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text('Personalized Care Plan', marginX, y);

    if (this.result.recommendations?.length) {
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);

      this.result.recommendations.forEach((rec, index) => {
        // Number pill
        const pillX = marginX;
        const pillY = y + 1;
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(219, 234, 254);
        doc.roundedRect(pillX, pillY - 4, 6, 6, 1.5, 1.5, 'FD');

        doc.setTextColor(37, 99, 235);
        doc.setFontSize(8);
        doc.text(String(index + 1), pillX + 3, pillY, { align: 'center', baseline: 'middle' as any });

        // Text
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(11);
        const textX = pillX + 9;
        const text = rec;
        const split = doc.splitTextToSize(text, pageWidth - marginX - textX);
        doc.text(split, textX, y);
        y += 9 + (split.length - 1) * 5;
      });
    }

    // Footer notice
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    const footer = 'This report is generated by AI and is for informational purposes only. It does not replace professional dental advice.';
    const footerLines = doc.splitTextToSize(footer, pageWidth - marginX * 2);
    doc.text(footerLines, marginX, y);

    doc.save(`smile-report-${this.externalPatientId}.pdf`);
  }
}
