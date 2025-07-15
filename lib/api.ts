import { createApp } from "./app";

const app = createApp();

app.listen(4000, () => {
  console.log(
    "Domain Verification Service is running on http://localhost:4000"
  );
});
