import { Request, Response } from 'express'
import { IService } from '../interfaces/i.service';

export class Controller {
    private service: IService

    constructor(
        service: IService
    ) {
        this.service = service
    }

    async bulkUploadCrm(req: Request, res: Response) {
        try {
            console.log(req.file)
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const jobId = await this.service.processCsvAndReturnLead(req.file.buffer.toString('utf-8'));
            res.json({ jobId, message: 'File queued for processing' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to queue file', error });
        }
    }

    async getAllJobResults(req: Request, res: Response) {
        try {
            const results = await this.service.getAllJobResults();
            return res.json(results);
        } catch (error) {
            return res.status(500).json({ message: 'Failed to get job results', error });
        }
    }
}
