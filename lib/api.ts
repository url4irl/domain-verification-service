import { createApp } from "./app";

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `Domain Verification Service is running on http://localhost:${PORT}`
  );
});
