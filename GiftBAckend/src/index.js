import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';                 
import rateLimit from 'express-rate-limit'; 
import  routes  from './routes/routes.js';

dotenv.config({ quiet: true });


const app = express();
const port = process.env.PORT || 2323;

app.use(helmet());

app.use(cors());

const limiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100,                
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,    
  legacyHeaders: false,     
});
app.use(limiter);

app.use(express.json());

if (!process.env.MONGODB_URL) {
  console.error('❌ MONGODB_URL is not defined in .env file');
  process.exit(1); 
}

mongoose.connect(process.env.MONGODB_URL)
.then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  
  });
app.use('/', routes)

app.listen(port, () => {
  console.log(`🚀  Server running on  http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await mongoose.disconnect();
  console.log('🛑 MongoDB disconnected on app termination');
  process.exit(0);
});