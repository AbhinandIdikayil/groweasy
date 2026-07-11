import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { mapToCRMFormat } from '../service/AIService';
import { ENV } from '../config/env';
import { BatchJobResult } from '../interfaces/BatchJobResult';
import { CRMRecord } from '../interfaces/CRMRecord';

const TTL_MS = 24 * 60 * 60 * 1000;

const connection = new IORedis({
    host: ENV.REDIS_HOST,
    port: Number(ENV.REDIS_PORT),
    password: ENV.REDIS_PASSWORD,
    username: ENV.REDIS_USERNAME,
    maxRetriesPerRequest: null
});

export const leadQueue = new Queue('lead-processing', { connection });

const jobResults = new Map<string, { result: BatchJobResult; completedAt: number }>();

export function getJobResult(jobId: string): BatchJobResult | undefined {
    return jobResults.get(jobId)?.result;
}

export function getAllJobResults(): BatchJobResult[] {
    const now = Date.now();
    for (const [id, entry] of jobResults) {
        if (entry.result.status !== 'processing' && now - entry.completedAt > TTL_MS) {
            jobResults.delete(id);
        }
    }
    return Array.from(jobResults.values()).map(e => e.result);
}

export const worker = new Worker('lead-processing', async (job) => {
    const { data } = job.data;
    const records: any[] = [];
    const skippedRecords: { row: number; reason: string }[] = [];

    let rowIndex = 0;
    const parser = Readable.from(data).pipe(parse({ columns: true, skip_empty_lines: true }));

    for await (const record of parser as any) {
        rowIndex++;
        if (record.email || record.mobile_without_country_code) {
            records.push(record);
        } else {
            skippedRecords.push({ row: rowIndex, reason: 'Missing both email and mobile' });
        }
    }

    const result: BatchJobResult = {
        jobId: job.id as string,
        status: 'processing',
        totalRecords: rowIndex,
        totalSkipped: skippedRecords.length,
        totalImported: 0,
        records: [],
        skippedRecords,
    };
    jobResults.set(job.id as string, { result, completedAt: Date.now() });

    const allMappedRecords: CRMRecord[] = [];
    for (let i = 0; i < records.length; i += 5) {
        const batch = records.slice(i, i + 5);
        const mappedRecords = await mapToCRMFormat(batch);
        allMappedRecords.push(...mappedRecords);
    }

    result.status = 'completed';
    result.totalImported = allMappedRecords.length;
    result.records = allMappedRecords;
    jobResults.set(job.id as string, { result, completedAt: Date.now() });

    return result;
}, { connection });
