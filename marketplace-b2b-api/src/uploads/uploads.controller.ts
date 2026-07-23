import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { claimEvidenceMulterOptions } from './claim-evidence.storage';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  @Post()
  @Roles(UserRole.COMPRADOR)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir un archivo (ej. foto de evidencia de un reclamo) desde el dispositivo',
    description:
      'Un archivo por peticion (el frontend sube varios en paralelo si hace falta). Maximo 5MB, solo imagenes. Se guarda en disco local del servidor y se devuelve la ruta relativa para usar en POST /claims (evidenceUrls) -- el frontend la resuelve a URL absoluta con resolveUploadUrl().',
  })
  @ApiResponse({ status: 201, description: 'Ruta relativa del archivo subido.' })
  @ApiResponse({ status: 400, description: 'Archivo invalido, muy grande, o formato no soportado.' })
  @UseInterceptors(FileInterceptor('file', claimEvidenceMulterOptions))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Adjunta un archivo');
    }
    return { url: `/uploads/claims/${file.filename}` };
  }
}
