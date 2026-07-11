import { Router } from 'express'
import { Service } from '../service/service';
import { Controller } from '../controller/controller';
import multer from 'multer';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

const service = new Service()
const controller = new Controller(service)

router.route('/bulk-upload')
    .post(upload.single('file'), controller.bulkUploadCrm.bind(controller));

router.route('/bulk-upload')
    .get(controller.getAllJobResults.bind(controller));

export { router }
