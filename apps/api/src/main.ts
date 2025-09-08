import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Stricter rate limiting for auth endpoints
  app.use('/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }));
  
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
  }));

  // CORS with security considerations
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || false
      : ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
  });

  // Swagger documentation
  // Compute Swagger base URL. Prefer explicit environment variable when present.
  // If not set, use app.getGlobalPrefix() if available, otherwise fall back to localhost:3001
  let swaggerBase = process.env.API_PUBLIC_URL;

  if (!swaggerBase) {
    try {
      // Nest exposes getGlobalPrefix on the INestApplication instance
      // @ts-ignore - use cautiously in case of older Nest versions
      const globalPrefix = (app as any).getGlobalPrefix?.();
      if (globalPrefix) {
        const prefix = globalPrefix.startsWith('/') ? globalPrefix : `/${globalPrefix}`;
        swaggerBase = `http://localhost:3001${prefix}`;
      }
    } catch (e) {
      // ignore and fallback
    }
  }

  if (!swaggerBase) swaggerBase = 'http://localhost:3001';

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
      docExpansion: 'none',
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
  await app.listen(port);
  console.log(`🚀 Lumea API running on port ${port}`);
  console.log(`📚 API documentation available at http://localhost:${port}/docs (Swagger server: ${swaggerBase})`);
}

bootstrap();