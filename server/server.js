require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const Subject = require('./models/Subject');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!process.env.MONGO_URI) { console.error("MONGO_URI environment variable is missing"); process.exit(1); }
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/hierarchy', require('./routes/hierarchyRoutes'));
app.use('/api/admin', adminRoutes);

// Public subjects route (for student UI)
app.get('/api/subjects', async (req, res) => {
  try {
    const filter = { isActive: true };
    // We can filter by dept/sem using query params
    res.json(await Subject.find(filter));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
