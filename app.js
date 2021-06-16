/* eslint-disable no-console */

const path = require('path');
const url = require('url');
require('dotenv').config();
const express = require('express'); // eslint-disable-line import/no-unresolved
const helmet = require('helmet');
const mongoose = require("mongoose")
const bodyParser = require("body-parser")

const { Provider } = require('oidc-provider');

const Account = require('./support/account');
const configuration = require('./support/configuration');
const routes = require('./routes/express');

const { PORT = 3005, ISSUER = `http://localhost:${PORT}` } = process.env;
configuration.findAccount = Account.findAccount;

const app = express();
app.use(helmet());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
mongoose.connection.on("error", err => {
  console.log("err", err)
})
mongoose.connection.on("connected", (err, res) => {
  console.log("mongoose is connected")
})

let server;
(async () => {
  let adapter;
  if (process.env.MONGODB_URI) {
    adapter = require('./adapters/mongodb'); // eslint-disable-line global-require
    await adapter.connect();
  }

  const prod = process.env.NODE_ENV === 'production';

  const provider = new Provider(ISSUER, { adapter, ...configuration });

  if (prod) {
    app.enable('trust proxy');
    provider.proxy = true;

    app.use((req, res, next) => {
      if (req.secure) {
        next();
      } else if (req.method === 'GET' || req.method === 'HEAD') {
        res.redirect(url.format({
          protocol: 'https',
          host: req.get('host'),
          pathname: req.originalUrl,
        }));
      } else {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'do yourself a favor and only use https',
        });
      }
    });
  }

  routes(app, provider);
  app.use(provider.callback());
  server = app.listen(PORT, () => {
    console.log(`application is listening on port ${PORT}, check its /.well-known/openid-configuration`);
  });
})().catch((err) => {
  if (server && server.listening) server.close();
  console.error(err);
  process.exitCode = 1;
});