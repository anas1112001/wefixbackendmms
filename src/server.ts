import 'reflect-metadata'
import dotenv from 'dotenv'
import express, { Application } from 'express'
import fs from 'fs';
import https from 'https';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import createMiddleware from 'redoc-express';
import { USER_DATA } from './db/seeds'
import { User } from './db/models'
import { Umzug } from 'umzug'
import { orm, ORM } from './db/orm'
import apiRoutes from './RESTful/routes';
import { errorHandler } from './RESTful/middleware/error.middleware';
import { openApiSpec } from './RESTful/docs/openapi';

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
        console.log(`${req.method} ${req.path}`);
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
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`📁 Created uploads directory: ${uploadsDir}`);
    }
    
    // Serve static files from uploads directory
    this.app.use('/uploads', express.static(uploadsDir, {
      // Set proper headers for file downloads
      setHeaders: (res, filePath) => {
        // Set content type based on file extension
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
        // Allow CORS for file access
        res.setHeader('Access-Control-Allow-Origin', '*');
      },
    }));
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
      res.status(404).json({
        success: false,
        message: 'Route not found',
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
