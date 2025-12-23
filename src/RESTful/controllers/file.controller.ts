import { Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

import { File, FileReferenceType, FileType, StorageProvider, FileCategory } from '../../db/models/file.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get referenceId (ticketId) and referenceType from request body
    const referenceId = req.body.referenceId ? parseInt(req.body.referenceId) : null;
    const referenceType = req.body.referenceType || FileReferenceType.TICKET_ATTACHMENT;
    const entityType = req.body.entityType || 
                       (referenceType === FileReferenceType.TICKET_ATTACHMENT ? 'ticket' : 
                        referenceType === FileReferenceType.COMPANY ? 'company' :
                        referenceType === FileReferenceType.CONTRACT ? 'contract' : 'user');
    
    // If it's a ticket file and ticketId is provided, save to ticket-specific folder
    if (entityType === 'ticket' && referenceId) {
      const ticketDir = path.join(process.cwd(), 'public', 'WeFixFiles', 'tickets', String(referenceId));
      if (!fs.existsSync(ticketDir)) {
        fs.mkdirSync(ticketDir, { recursive: true });
      }
      cb(null, ticketDir);
      return;
    }
    
    // For contract files, save to Contracts folder
    if (entityType === 'contract' || referenceType === FileReferenceType.CONTRACT) {
      const contractsDir = path.join(process.cwd(), 'public', 'WeFixFiles', 'Contracts');
      if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
      }
      cb(null, contractsDir);
      return;
    }
    
    // Default: save to WeFixFiles root (will be moved later if needed)
    const uploadDir = path.join(process.cwd(), 'public', 'WeFixFiles');
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

// Helper function to sanitize category value - accepts valid enum values
// Maps Flutter app category values to database enum values
const sanitizeCategory = (category: any): FileCategory | null => {
  if (!category || typeof category !== 'string') {
    return null;
  }
  const normalized = category.toLowerCase().trim();
  
  // Map to valid enum values
  switch (normalized) {
    case FileCategory.IMAGE:
      return FileCategory.IMAGE;
    case FileCategory.DOCUMENT:
      return FileCategory.DOCUMENT;
    case FileCategory.VIDEO:
      return FileCategory.VIDEO;
    case FileCategory.AUDIO:
      return FileCategory.AUDIO;
    case FileCategory.OTHER:
      return FileCategory.OTHER;
    case FileCategory.CONTRACT: // Legacy value, kept for backward compatibility
      return FileCategory.CONTRACT;
    default:
      // Invalid category, return null
      return null;
  }
};

/**
 * Upload single file
 * POST /api/v1/files/upload
 */
export const uploadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;
  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
  }

  const {file} = req;
  const fileExtension = path.extname(file.originalname);
  const fileType = getFileTypeFromExtension(fileExtension);
  const fileSizeMB = parseFloat((file.size / (1024 * 1024)).toFixed(2));

  // Get referenceId (ticketId) from request body - required for entity_id
  const referenceId = req.body.referenceId ? parseInt(req.body.referenceId) : null;
  if (!referenceId) {
    throw new AppError('referenceId (ticketId) is required for file upload', 400, 'VALIDATION_ERROR');
  }
  const referenceType = req.body.referenceType || FileReferenceType.TICKET_ATTACHMENT;
  // Use entityType from request if provided, otherwise derive from referenceType
  const entityType = req.body.entityType || 
                     (referenceType === FileReferenceType.COMPANY ? 'company' : 
                      referenceType === FileReferenceType.CONTRACT ? 'contract' : 
                      referenceType === FileReferenceType.TICKET_ATTACHMENT ? 'ticket' :
                      referenceType === FileReferenceType.USER ? 'user' : 'ticket');

  // Create file record in database with ALL required fields
  // Note: referenceType column doesn't exist in database, so we use entityType 'ticket' for ticket attachments
  const fileRecord = await File.create({
    // New required columns (from migration)
    fileExtension: fileExtension.replace('.', ''), // e.g., "jpg", "pdf"
    fileSizeMB, // Size in MB
    fileType, // e.g., "image", "pdf"
    filePath: file.path, // Full path to the file
    storageProvider: StorageProvider.LOCAL, // Always LOCAL for now
    description: null, // Optional description
    uploadedBy: user.id, // User who uploaded this file
    // Legacy columns (still in use)
    filename: file.filename, // Stored filename on disk (generated by multer)
    originalFilename: file.originalname, // Original filename from user's device
    path: file.path, // Full path to the file
    mimeType: file.mimetype, // MIME type
    size: file.size, // File size in bytes
    category: sanitizeCategory(fileType === FileType.IMAGE ? 'image' : null), // Legacy enum - only 'image' is valid
    entityType: referenceType === FileReferenceType.COMPANY ? 'company' : 
                referenceType === FileReferenceType.CONTRACT ? 'contract' : 
                referenceType === FileReferenceType.TICKET_ATTACHMENT ? 'ticket' : 'user', // Use 'ticket' for ticket attachments
    entityId: referenceId, // Entity ID (ticket ID) - required
    createdBy: user.id, // User who uploaded (legacy)
    // Note: referenceType column doesn't exist in database, so we don't save it
  } as any) as any;

  // Build public path based on entity type and ID
  // For ticket files, always use ticket-specific path
  let publicPath: string;
  if (entityType === 'ticket' && referenceId) {
    publicPath = `/WeFixFiles/tickets/${referenceId}/${file.filename}`;
    // Update filePath in database to match the public path
    await fileRecord.update({
      filePath: publicPath,
      path: publicPath,
    } as any);
  } else if (entityType === 'contract' || referenceType === FileReferenceType.CONTRACT) {
    publicPath = `/WeFixFiles/Contracts/${file.filename}`;
  } else {
    publicPath = `/WeFixFiles/${file.filename}`;
  }
  
  // Update file record with correct public path
  await fileRecord.update({
    path: publicPath,
    filePath: publicPath,
  } as any);
  
  const fileUrl = publicPath;

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      id: (fileRecord as any).id,
      fileName: (fileRecord as any).filename,
      fileExtension: (fileRecord as any).fileExtension,
      fileType: (fileRecord as any).fileType,
      fileSizeMB: (fileRecord as any).fileSizeMB,
      filePath: fileUrl, // Use URL path instead of server path
      referenceId: (fileRecord as any).entityId,
      referenceType,
      uploadedAt: (fileRecord as any).createdAt,
    },
  });
});

/**
 * Upload multiple files
 * POST /api/v1/files/upload-multiple
 */
export const uploadMultipleFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;
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
  if (!referenceId) {
    throw new AppError('referenceId (ticketId) is required for file upload', 400, 'VALIDATION_ERROR');
  }
  const referenceType = req.body.referenceType || FileReferenceType.TICKET_ATTACHMENT;

  const uploadedFiles = [];
  
  // Get entity fields (can be sent directly or derived from referenceType)
  const entityId = req.body.entityId ? parseInt(req.body.entityId) : referenceId;
  // Use entityType from request if provided, otherwise derive from referenceType
  // entityType enum now supports 'company', 'contract', 'user', 'ticket'
  // For TICKET_ATTACHMENT, we use 'ticket' as entityType
  const entityType = req.body.entityType || 
                     (referenceType === FileReferenceType.COMPANY ? 'company' : 
                      referenceType === FileReferenceType.CONTRACT ? 'contract' : 
                      referenceType === FileReferenceType.TICKET_ATTACHMENT ? 'ticket' :
                      referenceType === FileReferenceType.USER ? 'user' : 'ticket');

  // Debug: Log request body to see the format
  console.log('Request body fileMetadata:', JSON.stringify(req.body.fileMetadata, null, 2));

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Access metadata from the already-parsed array
    // Express/multer parses the form data into an array of objects
    const metadata = req.body.fileMetadata?.[i] || {};
    
    console.log(`File ${i} metadata:`, JSON.stringify(metadata));
    
    // Use metadata from mobile app if available, otherwise calculate from file
    const fileExtension = metadata.extension || path.extname(file.originalname).replace('.', '');
    const fileType = metadata.type || getFileTypeFromExtension(fileExtension);
    const fileSizeMB = metadata.sizeMB ? parseFloat(metadata.sizeMB) : parseFloat(((file.size || 0) / (1024 * 1024)).toFixed(2));
    const originalFilename = metadata.originalFilename || file.originalname;
    const mimeType = metadata.mimeType || file.mimetype;
    const sizeBytes = metadata.size ? parseInt(metadata.size) : (file.size || 0);
    // Category is a legacy field - only 'image' is valid, others should be null
    // Sanitize to ensure only valid enum values are used
    const category = sanitizeCategory(metadata.category || (fileType === 'image' ? 'image' : null));
    const storageProvider = metadata.storageProvider || 'LOCAL';
    const description = metadata.description || null;
    
    console.log(`File ${i} final values:`, {
      fileExtension,
      fileType,
      fileSizeMB,
      storageProvider,
      category,
    });

    // Create file record with ALL required fields
    // Note: referenceType is not stored in database (column doesn't exist)
    // We use entityType 'ticket' for ticket attachments instead
    const fileRecord = await File.create({
      // New required columns (from migration)
      fileExtension, // e.g., "jpg", "pdf"
      fileSizeMB, // Size in MB
      fileType, // e.g., "image", "pdf"
      filePath: file.path, // Full path to the file (server path from multer)
      storageProvider, // Storage provider
      description, // Optional description
      uploadedBy: user.id, // User who uploaded this file
      // Legacy columns (still in use)
      filename: file.filename, // Stored filename on disk (generated by multer)
      originalFilename, // Original filename from user's device
      path: file.path, // Full path to the file
      mimeType, // MIME type
      size: sizeBytes, // File size in bytes
      category, // Legacy enum
      entityType, // Entity type from metadata or request (for TICKET_ATTACHMENT, this should be 'ticket')
      entityId, // Entity ID (ticket ID)
      createdBy: user.id, // User who uploaded (legacy)
      // Note: referenceType column doesn't exist in database, so we don't save it
      // We use entityType 'ticket' to identify ticket attachments
    } as any) as any;

    // Build public path based on entity type and ID
    let publicPath: string;
    if (entityType === 'ticket' && entityId) {
      publicPath = `/WeFixFiles/tickets/${entityId}/${file.filename}`;
    } else if (entityType === 'contract' || referenceType === FileReferenceType.CONTRACT) {
      publicPath = `/WeFixFiles/Contracts/${file.filename}`;
    } else {
      publicPath = `/WeFixFiles/${file.filename}`;
    }
    
    // Update file record with correct public path
    await fileRecord.update({
      path: publicPath,
      filePath: publicPath,
    } as any);

    uploadedFiles.push({
      id: (fileRecord as any).id,
      fileName: (fileRecord as any).filename,
      fileExtension: (fileRecord as any).fileExtension,
      fileType: (fileRecord as any).fileType,
      fileSizeMB: (fileRecord as any).fileSizeMB,
      filePath: publicPath, // Use public path
      referenceId: (fileRecord as any).entityId,
      referenceType,
      uploadedAt: (fileRecord as any).createdAt,
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
  const {user} = req;
  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const referenceId = req.query.referenceId ? parseInt(req.query.referenceId as string) : null;
  const referenceType = (req.query.referenceType as string) || null;

  if (!referenceId || !referenceType) {
    throw new AppError('referenceId and referenceType are required', 400, 'VALIDATION_ERROR');
  }

  // Use legacy columns for querying
  // Map referenceType to entityType (now supports 'ticket' for ticket attachments)
  let entityType: string;
  if (referenceType === FileReferenceType.TICKET_ATTACHMENT) {
    entityType = 'ticket'; // Use 'ticket' now that it's in the enum
  } else if (referenceType === FileReferenceType.COMPANY) {
    entityType = 'company';
  } else if (referenceType === FileReferenceType.CONTRACT) {
    entityType = 'contract';
  } else {
    entityType = 'user';
  }

  const files = await File.findAll({
    where: {
      entityId: referenceId,
      entityType,
    },
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    success: true,
    message: 'Files retrieved successfully',
    data: files.map((file: any) => ({
      id: file.id,
      fileName: file.filename,
      fileExtension: file.fileExtension,
      fileType: file.fileType,
      fileSizeMB: file.fileSizeMB,
      filePath: file.filePath,
      referenceId: file.entityId,
      referenceType,
      uploadedAt: file.createdAt,
    })),
  });
});

/**
 * Delete a file (soft delete)
 * DELETE /api/v1/files/:id
 */
export const deleteFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;
  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const fileId = parseInt(req.params.id);
  if (isNaN(fileId)) {
    throw new AppError('Invalid file ID', 400, 'VALIDATION_ERROR');
  }

  const file = await File.findByPk(fileId);
  if (!file) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  // Hard delete (soft delete columns were removed)
  await file.destroy();

  res.status(200).json({
    success: true,
    message: 'File deleted successfully',
  });
});

/**
 * Serve file by ID
 * GET /api/v1/files/:id
 * This endpoint serves the actual file content, not JSON metadata
 */
export const serveFileById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fileId = parseInt(req.params.id);
  if (isNaN(fileId)) {
    throw new AppError('Invalid file ID', 400, 'VALIDATION_ERROR');
  }

  const file = await File.findByPk(fileId);
  if (!file) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  // Get the file path - try filePath from database first, then path, then construct from filename
  const {filename} = (file as any);
  if (!filename) {
    throw new AppError('File filename not found', 404, 'NOT_FOUND');
  }

  // Try multiple locations in order of preference
  let actualFilePath: string | null = null;
  
  // 1. Try file_path from database (if it exists and is a valid path)
  const dbFilePath = (file as any).filePath || (file as any).path;
  if (dbFilePath && fs.existsSync(dbFilePath)) {
    actualFilePath = dbFilePath;
  }
  
  // 2. Try new location (volume mount - persisted)
  if (!actualFilePath) {
    const newLocationPath = path.join(process.cwd(), 'public', 'WeFixFiles', filename);
    if (fs.existsSync(newLocationPath)) {
      actualFilePath = newLocationPath;
    }
  }
  
  // 3. Fallback to old location (not persisted, may be lost after restart)
  if (!actualFilePath) {
    const oldLocationPath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(oldLocationPath)) {
      actualFilePath = oldLocationPath;
    }
  }
  
  // 4. If still not found, check if file_path in DB points to old location
  if (!actualFilePath && dbFilePath) {
    // Try to use the path from database even if it doesn't exist (for debugging)
    // But only if it's an absolute path
    if (path.isAbsolute(dbFilePath) && fs.existsSync(dbFilePath)) {
      actualFilePath = dbFilePath;
    }
  }

  if (!actualFilePath) {
    throw new AppError(
      `File not found on server. The file may have been lost after container restart. File was stored at: ${dbFilePath || 'unknown location'}`,
      404,
      'NOT_FOUND'
    );
  }

  // Set appropriate headers
  const ext = path.extname(actualFilePath).toLowerCase();
  if (ext === '.m4a' || ext === '.mp3' || ext === '.wav') {
    res.setHeader('Content-Type', 'audio/mpeg');
  } else if (ext === '.mp4' || ext === '.mov') {
    res.setHeader('Content-Type', 'video/mp4');
  } else if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.setHeader('Content-Type', 'image/jpeg');
  } else if (ext === '.png') {
    res.setHeader('Content-Type', 'image/png');
  }
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Disposition', `inline; filename="${(file as any).originalFilename || filename}"`);

  // Send the file
  res.sendFile(actualFilePath);
});






