import { IService } from "../interfaces/i.service";
import { leadQueue, getAllJobResults, getAllImportedRecords } from "../queue/leadProcessor";
import { BatchJobResult } from "../interfaces/BatchJobResult";
import { CRMRecord } from "../interfaces/CRMRecord";

export class Service implements IService {
    async processCsvAndReturnLead(csvData: string): Promise<string> {
        try {
            const job = await leadQueue.add('process-csv', { data: csvData });
            return job.id as string;
        } catch (error) {
            console.log(error)
            throw new Error('Failed to process CSV');
        }
    }

    async getAllJobResults(): Promise<BatchJobResult[]> {
        return getAllJobResults();
    }

    async getAllImportedRecords(): Promise<CRMRecord[]> {
        return getAllImportedRecords();
    }
}
