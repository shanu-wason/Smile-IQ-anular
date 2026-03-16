import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-capture-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './capture-panel.component.html',
  styleUrls: ['./capture-panel.component.scss'],
})
export class CapturePanelComponent {
  @Input() externalPatientId: number | null = null;
  @Input() showCaptureOptions = true;
  @Input() imagePreviewUrl: string | null = null;
  @Input() isCameraActive = false;
  @Input() loading = false;
  @Input() hasSelectedFile = false;

  @Output() externalPatientIdChange = new EventEmitter<number>();
  @Output() openCamera = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<Event>();
  @Output() resetCapture = new EventEmitter<void>();
  @Output() capturePhoto = new EventEmitter<void>();
  @Output() stopCamera = new EventEmitter<void>();
  @Output() submitScan = new EventEmitter<void>();
}

