import { Router } from 'express';
import { FileController } from './file.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

router.post('/folders/:folderId/files', authorize('ADMIN', 'ENQUETEUR'), FileController.uploadMiddleware, FileController.upload);
router.get('/folders/:folderId/files', authorize('ADMIN', 'ENQUETEUR'), FileController.listInFolder);

router.get('/files/stream/:id', FileController.stream);
router.get('/files/:id/download', FileController.download);
router.get('/files/:id/metadata', FileController.getMetadata);
router.patch('/files/:id', authorize('ADMIN', 'ENQUETEUR'), FileController.rename);
router.delete('/files/:id', authorize('ADMIN', 'ENQUETEUR'), FileController.delete);

export { router as fileRoutes };
