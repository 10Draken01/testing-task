import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp(process.env.DB_PATH ?? './data.db');
const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));