import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { File, FileReferenceType, FileType, StorageProvider } from '../../db/models/file.model';
import { AuthRequest } from '../middleware/auth.middleware';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// Configure multer
export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now (you can restrict based on mime type if needed)
    cb(null, true);
  },
});

// Helper function to determine file type from extension
const getFileTypeFromExtension = (extension: string): FileType => {
  const ext = extension.toLowerCase().replace('.', '');
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return FileType.IMAGE;
    case 'pdf':
      return FileType.PDF;
    case 'doc':
      return FileType.DOC;
    case 'docx':
      return FileType.DOCX;
    case 'xls':
    case 'xlsx':
      return FileType.EXCEL;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return FileType.VIDEO;
    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'aac':
      return FileType.OTHER; // Audio files
    default:
      return FileType.OTHER;
  }
};

/**
 * Upload single file
 * POST /api/v1/files/upload
 */
export const uploadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
  }

  const file = req.file;
  const fileExtension = path.extname(file.originalname);
  const fileType = getFileTypeFromExtension(fileExtension);
  const fileSizeMB = parseFloat((file.size / (1024 * 1024)).toFixed(2));

  // Get referenceId and referenceType from request body (optional for now, can be updated later)
  const referenceId = req.body.referenceId ? parseInt(req.body.referenceId) : null;
  const referenceType = req.body.referenceType || FileReferenceType.GENERAL;

  // Create file record in database
  const fileRecord = await File.create({
    referenceId,
    referenceType,
    fileName: file.filename,
    fileExtension,
    fileType,
    fileSizeMB,
    filePath: file.path, // Local path for now
    storageProvider: StorageProvider.LOCAL,
    uploadedBy: user.id,
    uploadedAt: new Date(),
    isDeleted: false,
  });

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      id: fileRecord.id,
      fileName: fileRecord.fileName,
      fileExtension: fileRecord.fileExtension,
      fileType: fileRecord.fileType,
      fileSizeMB: fileRecord.fileSizeMB,
      filePath: fileRecord.filePath,
      referenceId: fileRecord.referenceId,
      referenceType: fileRecord.referenceType,
      uploadedAt: fileRecord.uploadedAt,
    },
  });
});

/**
 * Upload multiple files
 * POST /api/v1/files/upload-multiple
 */
export const uploadMultipleFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    throw new AppError('No files uploaded', 400, 'VALIDATION_ERROR');
  }

  // Handle different multer file types
  let files: Express.Multer.File[] = [];
  if (Array.isArray(req.files)) {
    files = req.files;
  } else if (req.files) {
    // If it's an object with fieldnames, flatten all files into a single array
    files = Object.values(req.files).flat();
  }

  if (files.length === 0) {
    throw new AppError('No files uploaded', 400, 'VALIDATION_ERROR');
  }

  const referenceId = req.body.referenceId ? parseInt(req.body.referenceId) : null;
  const referenceType = req.body.referenceType || FileReferenceType.TICKET_ATTACHMENT;

  const uploadedFiles = [];

  for (const file of files) {
    const fileExtension = path.extname(file.originalname);
    const fileType = getFileTypeFromExtension(fileExtension);
    const fileSizeMB = parseFloat(((file.size || 0) / (1024 * 1024)).toFixed(2));

    const fileRecord = await File.create({
      referenceId,
      referenceType,
      fileName: file.filename,
      fileExtension,
      fileType,
      fileSizeMB,
      filePath: file.path,
      storageProvider: StorageProvider.LOCAL,
      uploadedBy: user.id,
      uploadedAt: new Date(),
      isDeleted: false,
    });

    uploadedFiles.push({
      id: fileRecord.id,
      fileName: fileRecord.fileName,
      fileExtension: fileRecord.fileExtension,
      fileType: fileRecord.fileType,
      fileSizeMB: fileRecord.fileSizeMB,
      filePath: fileRecord.filePath,
      referenceId: fileRecord.referenceId,
      referenceType: fileRecord.referenceType,
      uploadedAt: fileRecord.uploadedAt,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Files uploaded successfully',
    data: uploadedFiles,
  });
});

/**
 * Get files by reference (e.g., all files for a ticket)
 * GET /api/v1/files?referenceId=123&referenceType=TICKET_ATTACHMENT
 */
export const getFilesByReference = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const referenceId = req.query.referenceId ? parseInt(req.query.referenceId as string) : null;
  const referenceType = (req.query.referenceType as string) || null;

  if (!referenceId || !referenceType) {
    throw new AppError('referenceId and referenceType are required', 400, 'VALIDATION_ERROR');
  }

  const files = await File.findAll({
    where: {
      referenceId,
      referenceType,
      isDeleted: false,
    },
    order: [['uploadedAt', 'DESC']],
  });

  res.status(200).json({
    success: true,
    message: 'Files retrieved successfully',
    data: files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileExtension: file.fileExtension,
      fileType: file.fileType,
      fileSizeMB: file.fileSizeMB,
      filePath: file.filePath,
      referenceId: file.referenceId,
      referenceType: file.referenceType,
      uploadedAt: file.uploadedAt,
    })),
  });
});

/**
 * Delete a file (soft delete)
 * DELETE /api/v1/files/:id
 */
export const deleteFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const fileId = parseInt(req.params.id);
  if (isNaN(fileId)) {
    throw new AppError('Invalid file ID', 400, 'VALIDATION_ERROR');
  }

  const file = await File.findByPk(fileId);
  if (!file || file.isDeleted) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  // Soft delete
  await file.update({
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: user.id,
  });

  res.status(200).json({
    success: true,
    message: 'File deleted successfully',
  });
});

