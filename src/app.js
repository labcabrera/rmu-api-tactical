const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 3001;
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/rmu-tactical';

app.use(express.json());
app.use(cors());

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.log('Error conectando a MongoDB', err));

const usersRouter = require('./routes/tactical-games');
app.use('/v1/tactical-games', usersRouter);

app.get('/', (req, res) => {
  res.send('TODO');
});

app.listen(PORT, () => {
  console.log(`API started on ${PORT}`);
});