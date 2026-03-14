import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmileScanResponse } from '../models/smile-scan-response';

@Component({
  selector: 'app-insights-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights-panel.component.html',
  styleUrls: ['./insights-panel.component.scss'],
})
export class InsightsPanelComponent {
  @Input() result: SmileScanResponse | null = null;
  @Input() loading = false;
  @Input() riskLabel = '';
  @Input() riskPercent = 0;

  @Output() openCarePlan = new EventEmitter<void>();
}

