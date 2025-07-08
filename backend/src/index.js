import express from 'express';
import cors from 'cors';
import searchRoutes from './api/searchRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // To parse JSON bodies

// Routes
app.use('/api', searchRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Dream Team Builder API!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
