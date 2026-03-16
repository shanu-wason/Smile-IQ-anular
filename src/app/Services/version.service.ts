import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../Environment/environment';

export interface ApiVersionInfo {
  api: string;
  version: string;
  build: string;
  environment: string;
  timestampUtc: string;
}

@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly url = `${environment.apiBaseUrl}/api/v1/version`;

  constructor(private http: HttpClient) {}

  getVersion(): Observable<ApiVersionInfo> {
    return this.http.get<ApiVersionInfo>(this.url);
  }
}

