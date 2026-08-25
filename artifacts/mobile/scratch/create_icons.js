const fs = require("fs");
const path = require("path");

const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const assetsDir = path.join(__dirname, "../assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(path.join(assetsDir, "icon.png"), pngBuffer);
fs.writeFileSync(path.join(assetsDir, "splash.png"), pngBuffer);
fs.writeFileSync(path.join(assetsDir, "adaptive-icon.png"), pngBuffer);
fs.writeFileSync(path.join(assetsDir, "favicon.png"), pngBuffer);
console.log("Mobile app icons created successfully!");
