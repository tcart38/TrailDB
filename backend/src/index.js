const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const locationsRouter = require('./routes/locations');
const settingsRouter  = require('./routes/settings');
const trailsRouter = require('./routes/trails');
const geoRouter    = require('./routes/geo');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/locations', locationsRouter);
app.use('/api/locations', trailsRouter);   // GET/POST /api/locations/:id/trails
app.use('/api',           trailsRouter);   // PUT/DELETE /api/trails/:id
app.use('/api/settings', settingsRouter);
app.use('/api/geo',      geoRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TrailDB backend listening on port ${PORT}`);
});
