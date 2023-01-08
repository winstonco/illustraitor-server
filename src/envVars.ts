import dotenv from 'dotenv';
dotenv.config();

const PORT: number = parseInt(process.env.PORT ?? '5555');
const ORIGIN: string = process.env.ORIGIN ?? 'http://localhost:5173';

export { PORT, ORIGIN };
