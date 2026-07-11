import { config } from 'dotenv'
config()

export const ENV = {
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_USERNAME: process.env.REDIS_USERNAME,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ORIGIN: process.env.ORIGIN
}