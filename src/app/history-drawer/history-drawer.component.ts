import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmileScanResponse } from '../models/smile-scan-response';

@Component({
  selector: 'app-history-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history-drawer.component.html',
  styleUrls: ['./history-drawer.component.scss'],
})
export class HistoryDrawerComponent {
  @Input() isOpen = false;
  @Input() history: SmileScanResponse[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() selectScan = new EventEmitter<SmileScanResponse>();
}

