import dotenv from 'dotenv';
dotenv.config();

const PORT: number = parseInt(process.env.PORT ?? '5555');

export { PORT };
