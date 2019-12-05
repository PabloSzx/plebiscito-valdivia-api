import express from "express";

const app = express();

app.use((req, res) => {
  res.send("Hello World");
});

app.listen(8080, () => {
  console.log(
    "Plebiscito Valdivia API Listening on port http://localhost:8080"
  );
});
