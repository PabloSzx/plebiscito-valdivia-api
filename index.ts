import "dotenv/config";
import "./src/db";

import axios from "axios";
import express from "express";
import morgan from "morgan";
import { resolve } from "path";
import qs from "qs";
import { generate } from "randomstring";
import requireEnv from "require-env-variable";

import { UserModel } from "./src/models/User";

const {
  CLAVE_UNICA_CLIENT_ID,
  CLAVE_UNICA_CLIENT_SECRET,
  CLAVE_UNICA_SANDBOX_CLIENT_ID,
  CLAVE_UNICA_SANDBOX_CLIENT_SECRET,
} = requireEnv([
  "CLAVE_UNICA_SANDBOX_CLIENT_ID",
  "CLAVE_UNICA_SANDBOX_CLIENT_SECRET",
  "CLAVE_UNICA_CLIENT_ID",
  "CLAVE_UNICA_CLIENT_SECRET",
]);

const redirect_uri_testing =
  "https://plebiscito-valdivia.pablosz.tech/testing/clave_unica/redirect";

const redirect_uri_real =
  "https://plebiscito-valdivia.pablosz.tech/clave_unica/redirect";

const app = express();

app.use(morgan("combined"));

app.use("/static", express.static(resolve(__dirname, "../static")));

const states: Record<string, boolean> = {};

app.get("/login", async (req, res) => {
  const state = generate(30);
  states[state] = true;
  const RedirectUrl = req.query.real
    ? `https://accounts.claveunica.gob.cl/openid/authorize?client_id=${CLAVE_UNICA_CLIENT_ID}&response_type=code&scope=openid run name email&redirect_uri=${redirect_uri_real}&state=${state}`
    : `https://accounts.claveunica.gob.cl/openid/authorize?client_id=${CLAVE_UNICA_SANDBOX_CLIENT_ID}&response_type=code&scope=openid run name email&redirect_uri=${redirect_uri_testing}&state=${state}`;
  res.send(
    `<html>
      <body>
        <a href="${RedirectUrl}">
          <img src=/static/btn_claveunica_202px.png />
        </a>
      </body>
    </html>`
  );
});

app.get("/testing/clave_unica/redirect", async (req, res) => {
  const { state, code } = req.query as { state?: string; code?: string };

  if (!state || !code || states[state] === undefined) {
    return res.redirect("/");
  }
  delete states[state];

  try {
    const {
      data: { access_token },
    } = await axios.post<{
      access_token: string;
      token_type: "bearer";
      expires_in: number;
      refresh_token?: string;
      id_token: string;
    }>(
      "https://accounts.claveunica.gob.cl/openid/token/",
      qs.stringify({
        client_id: CLAVE_UNICA_SANDBOX_CLIENT_ID,
        client_secret: CLAVE_UNICA_SANDBOX_CLIENT_SECRET,
        redirect_uri: redirect_uri_testing,
        grant_type: "authorization_code",
        state,
        code,
      }),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      }
    );

    const {
      data: { RolUnico, name, email },
    } = await axios.post<{
      sub: string;
      RolUnico: {
        numero: number;
        DV: string;
        tipo: string;
      };
      name: {
        nombres: string[];
        apellidos: string[];
      };
      email?: string;
    }>(
      "https://www.claveunica.gob.cl/openid/userinfo/",
      {},
      {
        headers: {
          authorization: `Bearer ${access_token}`,
        },
      }
    );
    const run = `${RolUnico.numero}-${RolUnico.DV}`;
    UserModel.findOneAndUpdate(
      {
        run,
      },
      {
        run,
        names: name.nombres,
        lastNames: name.apellidos,
        email,
        accessToken: access_token,
      },
      {
        upsert: true,
        new: true,
        projection: "_id",
      }
    ).catch(err => {
      console.error(`Error inserting a new user!`, err);
    });

    res.send(
      `Gracias por su voto ${name.nombres.join(" ")} ${name.apellidos.join(
        " "
      )}`
    );
  } catch (err) {
    if (err.response) {
      console.error(err.response);
    }
    res.status(500).send(err?.message ?? err);
  }
});

app.get("/clave_unica/redirect", async (req, res) => {
  const { state, code } = req.query as { state?: string; code?: string };

  if (!state || !code) {
    return res.redirect("/");
  }

  try {
    const {
      data: { access_token },
    } = await axios.post<{
      access_token: string;
      token_type: "bearer";
      expires_in: number;
      refresh_token?: string;
      id_token: string;
    }>(
      "https://accounts.claveunica.gob.cl/openid/token/",
      qs.stringify({
        client_id: CLAVE_UNICA_CLIENT_ID,
        client_secret: CLAVE_UNICA_CLIENT_SECRET,
        redirect_uri: redirect_uri_real,
        grant_type: "authorization_code",
        state,
        code,
      }),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { data } = await axios.post(
      "https://www.claveunica.gob.cl/openid/userinfo/",
      {},
      {
        headers: {
          authorization: `Bearer ${access_token}`,
        },
      }
    );

    res.send(data);
  } catch (err) {
    if (err.response) {
      console.error(err.response);
    }
    res.status(500).send(err?.message ?? err);
  }
});

app.get("/users", async (_req, res) => {
  res.send(await UserModel.find({}, "run names lastNames email"));
});

app.use((_req, res) => {
  res.redirect("/login");
});

app.listen(8080, () => {
  console.log(
    "Plebiscito Valdivia API Listening on port http://localhost:8080"
  );
});
