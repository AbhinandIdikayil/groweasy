import { BatchJobResult } from './BatchJobResult';

export interface IService {
    processCsvAndReturnLead(csvData: string): Promise<string>;
    getAllJobResults(): Promise<BatchJobResult[]>;
}
