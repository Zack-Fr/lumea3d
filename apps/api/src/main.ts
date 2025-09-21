import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Increase body size limits for thumbnail uploads
    bodyParser: true,
    rawBody: true,
  });
  
  // Configure Express to handle larger payloads (10MB limit)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));
  app.use(require('express').raw({ limit: '10mb' }));
  
  // Serve static files for thumbnails
  const thumbnailsPath = process.env.THUMBNAILS_STORAGE_PATH || join(process.cwd(), 'storage', 'thumbnails');
  app.useStaticAssets(thumbnailsPath, {
    prefix: '/storage/thumbnails/',
    setHeaders: (res) => {
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    },
  });
  
  // Security middleware - relaxed for development network access
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // Disable COOP for development
    crossOriginResourcePolicy: false, // Disable CORP for development
    hsts: false, // Disable HSTS for HTTP development
  }));

  // Rate limiting - TEMPORARILY DISABLED FOR TESTING
  // app.use(rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 100, // limit each IP to 100 requests per windowMs
  //   message: 'Too many requests from this IP, please try again later.',
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // }));

  // Stricter rate limiting for auth endpoints - TEMPORARILY DISABLED FOR TESTING
  // app.use('/auth/login', rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 5, // limit each IP to 5 login attempts per windowMs
  //   message: 'Too many login attempts, please try again later.',
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // }));
  
  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  
  // Global exception filter for consistent error handling
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Global validation pipe with enhanced security
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
    validationError: {
      target: false,
      value: false,
    },
    exceptionFactory: (errors) => {
      // Log detailed validation errors for debugging
      console.error('VALIDATION ERRORS:', JSON.stringify(errors, null, 2));
      return new BadRequestException({
        message: 'Validation failed',
        errors: errors,
        statusCode: 400
      });
    }
  }));

  // Use express cors middleware with permissive settings for testing
  const cors = require('cors');
  
  app.use(cors({
    origin: true, // Allow all origins for now
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-Match', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Total-Count'],
    preflightContinue: false,
    optionsSuccessStatus: 200
  }));
  
  // Add custom middleware to handle mobile browser access
  app.use((req, res, next) => {
    // Allow mobile browsers by relaxing security headers
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // CORS is now handled by express cors middleware above

  // Swagger documentation
  let swaggerBase = process.env.API_PUBLIC_URL;

  if (!swaggerBase) {
    try {
      // Nest exposes getGlobalPrefix on the INestApplication instance
      // @ts-ignore - use cautiously in case of older Nest versions
      const globalPrefix = (app as any).getGlobalPrefix?.();
      if (globalPrefix) {
        const prefix = globalPrefix.startsWith('/') ? globalPrefix : `/${globalPrefix}`;
        swaggerBase = `http://localhost:3000${prefix}`;
      }
    } catch (e) {
      // ignore and fallback
    }
  }

  if (!swaggerBase) swaggerBase = 'http://localhost:3000';

  const config = new DocumentBuilder()
    .setTitle('Lumea API')
    .setDescription(`
      # Lumea Interior Layout Generator API
      
      Advanced AI-powered interior layout generator with explainable spatial reasoning.
      
      ## Features
      - **3D Scene Management**: Create and manage complex 3D interior layouts
      - **Asset Processing Pipeline**: Automatic optimization with KTX2, Draco, and Meshopt variants
      - **Real-time Collaboration**: Server-Sent Events for live scene updates
      - **Optimistic Locking**: If-Match headers for safe concurrent editing
      - **Category-based Organization**: Enhanced scene manifests with filtering capabilities
      - **Processing Queue**: Background asset processing with status tracking
      
      ## Authentication
      All endpoints require Bearer token authentication unless explicitly marked as public.
      
      ## Rate Limiting
      - General API: 100 requests per 15 minutes per IP
      - Authentication: 5 attempts per 15 minutes per IP
      
      ## Versioning
      Scene operations support optimistic locking via If-Match headers for safe concurrent editing.
    `)
    .setVersion('1.0.0')
    .setContact(
      'Lumea Development Team',
      'https://lumea.dev',
      'support@lumea.dev'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addServer(swaggerBase, 'Primary API Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User profile and management')
    .addTag('Projects', 'Project creation and management')
    .addTag('Scenes', 'Scene CRUD operations and management')
    .addTag('Flat Scenes', 'Simplified scene endpoints with project context')
    .addTag('Assets', 'Asset upload, processing, and management')
    .addTag('Processing', 'Background processing and queue management')
    .addTag('Real-time', 'Server-Sent Events and live updates')
    .addTag('Storage', 'File storage and download endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => {
      return `${controllerKey}_${methodKey}`;
    },
  });
  
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
  docExpansion: 'list',
      defaultModelExpandDepth: 3,
      defaultModelsExpandDepth: 3,
    },
    customSiteTitle: 'Lumea API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
    ],
  });

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for network access
  await app.listen(port, host);
  console.log(`🚀 Lumea API running on ${host}:${port}`);
  console.log(`📚 API documentation available at http://${host}:${port}/docs (Swagger server: ${swaggerBase})`);
}

bootstrap();