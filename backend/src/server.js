import dotenv from "dotenv";
dotenv.config();
import * as dns from 'node:dns';

dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8']);
import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
