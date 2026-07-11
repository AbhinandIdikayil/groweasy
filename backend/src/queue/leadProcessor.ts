import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { mapToCRMFormat } from '../service/AIService';
import { ENV } from '../config/env';
import { BatchJobResult } from '../interfaces/BatchJobResult';
import { CRMRecord } from '../interfaces/CRMRecord';

const connection = new IORedis({
    host: ENV.REDIS_HOST,
    port: Number(ENV.REDIS_PORT),
    password: ENV.REDIS_PASSWORD,
    username: ENV.REDIS_USERNAME,
    maxRetriesPerRequest: null
});

export const leadQueue = new Queue('lead-processing', { connection });

const jobResults = new Map<string, BatchJobResult>();

export async function getAllJobResults(): Promise<BatchJobResult[]> {
    const results = Array.from(jobResults.values());

    const completedJobs = await leadQueue.getJobs(['completed']);
    for (const job of completedJobs) {
        if (!jobResults.has(job.id as string)) {
            const returnValue = job.returnvalue as BatchJobResult | null;
            if (returnValue) {
                const partial: BatchJobResult = {
                    jobId: job.id as string,
                    status: returnValue.status || 'completed',
                    totalRecords: returnValue.totalRecords || 0,
                    totalSkipped: returnValue.totalSkipped || 0,
                    totalImported: returnValue.totalImported || 0,
                    records: returnValue.records || [],
                    skippedRecords: returnValue.skippedRecords || [],
                };
                results.push(partial);
            }
        }
    }

    return results;
}

export async function getAllImportedRecords(): Promise<CRMRecord[]> {
    const jobs = await getAllJobResults();
    return jobs.flatMap(j => j.records);
}

export const worker = new Worker('lead-processing', async (job) => {
    const { data } = job.data;
    const records: { row: number; data: any }[] = [];
    const skippedRecords: { row: number; reason: string }[] = [];

    let rowIndex = 0;
    const parser = Readable.from(data).pipe(parse({ columns: true, skip_empty_lines: true }));

    for await (const record of parser as any) {
        rowIndex++;
        records.push({ row: rowIndex, data: record });
    }

    const result: BatchJobResult = {
        jobId: job.id as string,
        status: 'processing',
        totalRecords: rowIndex,
        totalSkipped: 0,
        totalImported: 0,
        records: [],
        skippedRecords,
    };
    jobResults.set(job.id as string, result);

    const allMappedRecords: CRMRecord[] = [];
    for (let i = 0; i < records.length; i += 5) {
        const batch = records.slice(i, i + 5);
        const batchData = batch.map(b => b.data);
        const mappedRecords = await mapToCRMFormat(batchData);
        
        for (let j = 0; j < mappedRecords.length; j++) {
            const mapped = mappedRecords[j];
            // If the AI somehow skipped records and the arrays don't align perfectly, 
            // fallback to i + j + 1 for row index.
            const rowNumber = batch[j] ? batch[j].row : (i + j + 1);
            
            if (!mapped.email && !mapped.mobile_without_country_code) {
                skippedRecords.push({ row: rowNumber, reason: 'Missing both email and mobile' });
            } else {
                allMappedRecords.push(mapped);
            }
        }
    }

    result.status = 'completed';
    result.totalImported = allMappedRecords.length;
    result.totalSkipped = skippedRecords.length;
    result.records = allMappedRecords;
    result.skippedRecords = skippedRecords;
    jobResults.set(job.id as string, result);

    return result;
}, {
    connection,
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 86400 },
});
