import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

// Carpeta local donde se guardan las fotos de evidencia (no hay bucket/S3 en este
// proyecto -- almacenamiento en disco local del servidor es suficiente para el alcance
// academico). Se sirve luego como estatico desde main.ts con prefijo /uploads.
export const CLAIM_EVIDENCE_DIR = join(process.cwd(), 'uploads', 'claims');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const claimEvidenceMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(CLAIM_EVIDENCE_DIR, { recursive: true });
      cb(null, CLAIM_EVIDENCE_DIR);
    },
    filename: (_req, file, cb) => {
      // Nombre unico para evitar colisiones/sobreescrituras entre distintos compradores
      const unique = `${Date.now()}-${randomUUID()}${extname(file.originalname).toLowerCase()}`;
      cb(null, unique);
    },
  }),
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException('Solo se aceptan imagenes (JPEG, PNG, WEBP, GIF)'), false);
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por archivo
    files: 5,
  },
};
