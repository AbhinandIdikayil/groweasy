import { BatchJobResult } from './BatchJobResult';
import { CRMRecord } from './CRMRecord';

export interface IService {
    processCsvAndReturnLead(csvData: string): Promise<string>;
    getAllJobResults(): Promise<BatchJobResult[]>;
    getAllImportedRecords(): Promise<CRMRecord[]>;
}
