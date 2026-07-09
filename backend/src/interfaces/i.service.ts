import { Express, Request, Response } from 'express'

export interface IService {
    processCsvAndReturnLead(csv: Express): Promise<any>;
}