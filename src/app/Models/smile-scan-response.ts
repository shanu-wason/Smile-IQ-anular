export interface SmileScanResponse {
  smileScore: number;
  alignmentScore: number;
  gumHealthScore: number;
  whitenessScore: number;
  symmetryScore: number;
  plaqueRiskLevel: string;
  confidenceScore: number;
  recommendations: string[];
}
