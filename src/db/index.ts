import mongoose from "mongoose";

import { setGlobalOptions } from "@typegoose/typegoose";

setGlobalOptions({
  globalOptions: {
    useNewEnum: true,
  },
});

export let mongoUrl = "mongodb://localhost:27017/plebiscito";

if (process.env.NODE_ENV !== "test") {
  mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true,
    ...(process.env.MONGOOSE_DB
      ? {
          auth: {
            user: process.env.MONGO_USER ?? "",
            password: process.env.MONGO_PASSWORD ?? "",
          },
        }
      : {}),
  });
}
