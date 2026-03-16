import app from "./app";
import { seedIfNeeded } from "./seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedIfNeeded().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch((err) => {
  console.error("Fatal startup error:", err);
  // Still start the server even if seed fails
  app.listen(port, () => {
    console.log(`Server listening on port ${port} (seed skipped)`);
  });
});
