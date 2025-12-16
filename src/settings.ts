import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

export const ormConfig = {
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  logging: true,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_USE_SSL ?? false,
  synchronize: true,
  username: process.env.DB_USER,
}

export const apiConfig = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshExpiresIn: '7d',
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
}
