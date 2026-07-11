import { CRMRecord } from './CRMRecord';

export interface BatchJobResult {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  totalRecords: number;
  totalSkipped: number;
  totalImported: number;
  records: CRMRecord[];
  skippedRecords: { row: number; reason: string }[];
  error?: string;
}
