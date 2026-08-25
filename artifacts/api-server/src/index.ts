import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "3001";
const port = Number(rawPort) > 0 ? Number(rawPort) : 3001;

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
