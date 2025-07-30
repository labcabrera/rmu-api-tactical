import app from './app';

const PORT: number = parseInt(process.env.PORT || '3003', 10);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
