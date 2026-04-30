import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
