import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../Environment/environment';
import { SmileScanResponse } from '../models/smile-scan-response';

@Injectable({ providedIn: 'root' })
export class SmileScanService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/smile-scans`;

  constructor(private http: HttpClient) { }

  uploadSmileImage(externalPatientId: number, image: File): Observable<SmileScanResponse> {
    const formData = new FormData();
    formData.append('ExternalPatientId', String(externalPatientId));
    formData.append('Image', image);
    return this.http.post<SmileScanResponse>(this.baseUrl, formData);
  }

  getScanHistory(externalPatientId: number) {
    return this.http.get<SmileScanResponse[]>(
      `${this.baseUrl}/${externalPatientId}`
    );
  }
}
