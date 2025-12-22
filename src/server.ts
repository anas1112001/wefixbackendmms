import 'reflect-metadata'
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv'
import express, { Application } from 'express'
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import createMiddleware from 'redoc-express';
import { Umzug } from 'umzug'

import { openApiSpec } from './RESTful/docs/openapi';
import { errorHandler } from './RESTful/middleware/error.middleware';
import apiRoutes from './RESTful/routes';
import { User } from './db/models'
import { orm, ORM } from './db/orm'
import { USER_DATA } from './db/seeds'


// Load environment variables
dotenv.config({ path: '.env' })

export class Server {
  private app: express.Application
  private migrator: Umzug
  private orm: ORM
  private port: string | number

  constructor(port: string | undefined, app: Application) {
    this.app = app
    this.port = port ?? 4000

    this.initilizeServer()
  }

  private establishDBConnection() {
    try {
      this.orm = orm
      this.migrator = orm.umzug
      console.log(`🚀DB Connection Established Successfully ...`)
      console.log('---------------------------------------------')
    } catch (error) {
      console.log(`DB ERROR ${error} :(`)
    }
  }

  private setupMiddleware() {
    // Enable CORS
    this.app.use(cors());
    
    // Body parser middleware
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '..', 'public')));
    
    // Request logging in development
    if (process.env.NODE_ENV !== 'production') {
      this.app.use((req, res, next) => {
        // Skip logging for static file requests and health check
        if (!req.path.startsWith('/WeFixFiles') && 
            !req.path.startsWith('/uploads') && 
            req.path !== '/health' &&
            req.path !== '/api/v1/health') {
          const authHeader = req.headers.authorization;
          if (!authHeader) {
            console.log(`${req.method} ${req.path} - No authorization header found`);
          } else {
            console.log(`${req.method} ${req.path}`);
          }
        }
        next();
      });
    }
  }

  private setupRoutes() {
    // OpenAPI JSON endpoint
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(openApiSpec);
    });

    // Redoc documentation endpoint
    this.app.get(
      '/docs',
      createMiddleware({
        specUrl: '/api-docs.json',
        title: 'MMS Backend API Documentation',
        redocOptions: {
          theme: {
            colors: {
              primary: {
                main: '#32329f',
              },
            },
            typography: {
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              headings: {
                fontFamily: 'Inter, sans-serif',
                fontWeight: '600',
              },
            },
          },
          scrollYOffset: 60,
          hideDownloadButton: false,
          hideHostname: false,
          expandResponses: '200,201',
          pathInMiddlePanel: true,
        },
      })
    );

    // API routes
    this.app.use('/api/v1', apiRoutes);
    
    // Serve uploaded files from uploads directory (must be before 404 handler)
    // This allows direct access to uploaded files via /uploads/filename.ext
    // Use the volume mount path for persistence in Docker: /app/public/WeFixFiles
    const uploadsDir = path.join(process.cwd(), 'public', 'WeFixFiles');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`📁 Created uploads directory: ${uploadsDir}`);
    }
    
    // Custom middleware to serve files from /WeFixFiles route
    // This handles file serving with proper error handling for paths like /WeFixFiles/Images/xx.png
    // Matches backend-oms structure for single source of truth
    // Also proxies from backend-oms if file not found locally
    this.app.use('/WeFixFiles', (req, res, next) => {
      // Extract path after /WeFixFiles (e.g., /WeFixFiles/Images/xx.png -> Images/xx.png)
      const relativePath = req.path.replace(/^\/+/, ''); // Remove leading slashes
      
      if (!relativePath) {
        return next(); // No path, pass to next middleware
      }
      
      // Build full path matching the stored structure (e.g., /WeFixFiles/Images/xx.png -> public/WeFixFiles/Images/xx.png)
      const filePath = path.join(process.cwd(), 'public', 'WeFixFiles', relativePath);
      
      // Check if file exists locally FIRST (before checking proxy header)
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Set proper headers
        if (filePath.endsWith('.m4a') || filePath.endsWith('.mp3') || filePath.endsWith('.wav')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        } else if (filePath.endsWith('.mp4') || filePath.endsWith('.mov')) {
          res.setHeader('Content-Type', 'video/mp4');
        } else if (filePath.endsWith('.pdf')) {
          res.setHeader('Content-Type', 'application/pdf');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.sendFile(filePath);
      }
      
      // File doesn't exist locally, check if request comes from backend-oms proxy
      // Prevent infinite loop: if request comes from backend-oms proxy, don't proxy again
      const proxyFrom = req.headers['x-proxy-from'] || req.headers['X-Proxy-From'];
      if (proxyFrom === 'backend-oms') {
        console.log(`[PROXY] Request from backend-oms detected, skipping proxy to prevent loop`);
        return next(); // Pass to 404 handler
      }
      
      // File doesn't exist locally and not from proxy, try to proxy from backend-oms
      // This ensures single source of truth - images uploaded via frontend-oms (backend-oms) 
      // are accessible from mobile-user (backend-mms)
      const omsBaseUrl = process.env.OMS_BASE_URL;
      if (omsBaseUrl) {
        
        // req.path is /Images/xx.png (route /WeFixFiles already matched)
        // We need to add /WeFixFiles back to the path for the proxy request
        const omsUrl = `${omsBaseUrl}/WeFixFiles${req.path}`;
        console.log(`[PROXY] Requesting file from backend-oms: ${omsUrl}`);
        
        // Use native https/http modules to proxy
        const urlModule = require('url');
        const parsedUrl = urlModule.parse(omsUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        // Add custom header to prevent infinite loop
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.path,
          method: 'GET',
          headers: {
            'X-Proxy-From': 'backend-mms',
          },
        };
        
        const proxyReq = client.request(options, (proxyRes: any) => {
          console.log(`[PROXY] Response from backend-oms: ${proxyRes.statusCode} for ${omsUrl}`);
          
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          // Copy content type
          if (proxyRes.headers['content-type']) {
            res.setHeader('Content-Type', proxyRes.headers['content-type']);
          }
          
          // Copy status code
          res.statusCode = proxyRes.statusCode || 200;
          
          // If successful, pipe the response
          if (proxyRes.statusCode === 200) {
            proxyRes.pipe(res);
          } else {
            // If not found in backend-oms either, return 404
            if (!res.headersSent) {
              res.status(404).send('File not found');
            }
          }
        });
        
        proxyReq.on('error', (err: any) => {
          console.error(`[PROXY] Error proxying from backend-oms (${omsUrl}):`, err.message);
          if (!res.headersSent) {
            res.status(404).send('File not found');
          }
        });
        
        // Set timeout (reduced to 5 seconds to fail faster)
        proxyReq.setTimeout(5000, () => {
          console.error(`[PROXY] Timeout proxying from backend-oms: ${omsUrl}`);
          proxyReq.destroy();
          if (!res.headersSent) {
            res.status(404).send('File not found');
          }
        });
        
        // End the request (required when using client.request())
        proxyReq.end();
        
        return; // Don't call next() - we're handling the request
      }
      
      // File not found and no OMS_BASE_URL configured, pass to next middleware (404 handler)
      next();
    });
    
    // Serve static files from uploads directory
    // Also serve from old location for backward compatibility with existing files
    const oldUploadsDir = path.join(process.cwd(), 'uploads');
    
    // Custom middleware to serve files from /uploads route
    // This handles file serving with proper error handling
    this.app.use('/uploads', (req, res, next) => {
      // Extract filename from path (e.g., /uploads/xx.png -> xx.png)
      const filename = req.path.replace(/^\/+/, ''); // Remove leading slashes
      
      if (!filename) {
        return next(); // No filename, pass to next middleware
      }
      
      // Try new location first
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Set proper headers
          if (filePath.endsWith('.m4a') || filePath.endsWith('.mp3') || filePath.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/mpeg');
          } else if (filePath.endsWith('.mp4') || filePath.endsWith('.mov')) {
            res.setHeader('Content-Type', 'video/mp4');
          } else if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
          } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          }
          res.setHeader('Access-Control-Allow-Origin', '*');
        return res.sendFile(filePath);
      }
      
      // Try old location if exists
      if (fs.existsSync(oldUploadsDir)) {
        const oldFilePath = path.join(oldUploadsDir, filename);
        if (fs.existsSync(oldFilePath) && fs.statSync(oldFilePath).isFile()) {
          // Set proper headers
          if (oldFilePath.endsWith('.m4a') || oldFilePath.endsWith('.mp3') || oldFilePath.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/mpeg');
          } else if (oldFilePath.endsWith('.mp4') || oldFilePath.endsWith('.mov')) {
            res.setHeader('Content-Type', 'video/mp4');
          } else if (oldFilePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
          } else if (oldFilePath.endsWith('.jpg') || oldFilePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (oldFilePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          }
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.sendFile(oldFilePath);
        }
      }
      
      // File not found, pass to next middleware (404 handler)
      next();
    });
    
    console.log(`📁 Serving uploads from: ${uploadsDir}`);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Welcome to the RESTful API',
        version: '1.0.0',
        documentation: '/docs',
        endpoints: {
          health: '/api/v1/health',
          users: '/api/v1/users',
          logs: '/api/v1/logs',
        },
      });
    });
    
    // 404 handler (must be last, after all routes including static files)
    this.app.use((req, res) => {
      // Check if this is a file request (uploads or WeFixFiles)
      const isFileRequest = req.path.startsWith('/uploads/') || req.path.startsWith('/WeFixFiles/');
      
      res.status(404).json({
        success: false,
        message: isFileRequest ? 'File not found' : 'Route not found',
        path: req.path,
      });
    });
    
    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  private listen() {
    const isDevelopment = process.env.NODE_ENV !== 'production'
    const domainKeyPath = path.join(__dirname, '..', 'domain.key');
    const domainCertPath = path.join(__dirname, '..', 'domain.crt');
    const hasSSLCertificates = fs.existsSync(domainKeyPath) && fs.existsSync(domainCertPath);
    
    if (isDevelopment || !hasSSLCertificates) {
      // Use HTTP for development or if SSL certificates are not available
      this.app.listen(this.port, (): void => {
        console.log('--------------------------------------------------------------')
        console.log(`🚀RESTful API Server is running on http://localhost:${this.port}`);
        console.log(`📚 API Documentation: http://localhost:${this.port}/docs`);
        console.log(`📄 OpenAPI Spec: http://localhost:${this.port}/api-docs.json`);
        if (!hasSSLCertificates && !isDevelopment) {
          console.log(`⚠️  SSL certificates not found, using HTTP instead of HTTPS`);
        }
        console.log('--------------------------------------------------------------')
      });
    } else {
      // Use HTTPS for production when certificates are available
      const httpsOptions = {
        key: fs.readFileSync(domainKeyPath),
        cert: fs.readFileSync(domainCertPath)
      };

      https.createServer(httpsOptions, this.app).listen({ port: this.port }, (): void => {
        console.log('--------------------------------------------------------------')
        console.log(`🚀RESTful API Server is running on https://localhost:${this.port}`);
        console.log(`📚 API Documentation: https://localhost:${this.port}/docs`);
        console.log(`📄 OpenAPI Spec: https://localhost:${this.port}/api-docs.json`);
        console.log('--------------------------------------------------------------')
      });
    }
  }

  private async seeds() {
    try {
      if (process.env.SEED_ENABLED === 'true') {
        await orm.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await User.sync({ force: true });
        await orm.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        await User.bulkCreate(USER_DATA as any[]);
        console.log('Seed Ended Successfully');
      } else {
        await User.sync();
        console.log('Tables Created Successfully');
      }
    } catch (error) {
      console.log(`Seed Error: ${error}`);
    }
  }


  initilizeServer = async () => {
    this.establishDBConnection()
    this.setupMiddleware()
    this.setupRoutes()
    this.listen()
    await this.seeds()
  }
}

new Server(process?.env.PORT, express())
