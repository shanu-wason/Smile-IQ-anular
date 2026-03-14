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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  showCaptureOptions = true;

  title = 'Smile Intelligence';

  externalPatientId = 1;
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;

  loading = false;
  errorMessage: string | null = null;
  result: SmileScanResponse | null = null;
  showHistory = false;   // add this with your other fields
  history: SmileScanResponse[] = [];
  private smileScanService = inject(SmileScanService);

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

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

  get totalScore(): number {
    return this.result?.smileScore ?? 0;
  }

  get riskLabel(): string {
    if (!this.result) return '';
    if (this.result.plaqueRiskLevel?.toLowerCase() === 'low') return 'LOW RISK';
    if (this.result.plaqueRiskLevel?.toLowerCase() === 'high') return 'HIGH RISK';
    return 'MEDIUM RISK';
  }
}
