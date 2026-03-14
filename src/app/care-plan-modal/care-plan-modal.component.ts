import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmileScanResponse } from '../models/smile-scan-response';

@Component({
  selector: 'app-care-plan-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './care-plan-modal.component.html',
  styleUrls: ['./care-plan-modal.component.scss'],
})
export class CarePlanModalComponent {
  @Input() isOpen = false;
  @Input() result: SmileScanResponse | null = null;

  @Output() close = new EventEmitter<void>();

  impactLabel(index: number): string {
    if (index === 0) return 'HIGH IMPACT';
    if (index === 1) return 'MEDIUM IMPACT';
    return 'MEDIUM IMPACT';
  }

  impactClass(index: number): string {
    if (index === 0) return 'high';
    if (index === 1) return 'medium';
    return 'medium';
  }
}

