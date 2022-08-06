"use strict";

const cluster = require("cluster");
const http = require("http");
const expect = require("chai").expect;
const express = require("express");
const request = require("request");
const async = require("async");

const Session = require("express-session");
const ClusterStore = require("..");
const CookieParser = require("cookie-parser");
const BodyParser = require("body-parser");

let workerUrl;

// verify we can call setup without express in master and workers
require("..").setup();

if (cluster.isWorker) {
  startExpressServer();
  return;
}

describe("clustered express server", function () {
  before(setupWorkers);
  after(stopWorkers);

  let KEY = "a-key";
  let PAYLOAD = "a-value";

  // NOTE We assume that the cluster does a perfect round-robin
  // distribution of requests among the workers

  it("shares sessions between workers", function (done) {
    async.series([load, save], function (err, results) {
      if (err) {
        return done(err);
      }
      expect(JSON.parse(results.pop()).value).to.equal(PAYLOAD);
      done();
    });
  });

  it("destroys a session shared between workers", function (done) {
    async.series([save, destroy, load], function (err, results) {
      if (err) {
        return done(err);
      }
      expect(results.pop().value).to.equal(undefined);
      done();
    });
  });

  function save(next) {
    sendCommand({ cmd: "set", key: KEY, value: PAYLOAD }, next);
  }

  function destroy(next) {
    sendCommand({ cmd: "del", key: KEY }, next);
  }

  function load(next) {
    sendCommand({ cmd: "get", key: KEY }, next);
  }
});

function sendCommand(command, cb) {
  request(
    {
      url: workerUrl,
      method: "POST",
      json: command,
    },
    function (err, res, body) {
      if (err) {
        return cb(err);
      }
      cb(null, res.request.body);
    }
  );
}

let WORKER_COUNT = 2;

function getNumberOfWorkers() {
  return Object.keys(cluster.workers).length;
}

function setupWorkers(done) {
  if (getNumberOfWorkers() > 0) {
    let msg = "Cannot setup workers: there are already other workers running.";
    return done(new Error(msg));
  }

  cluster.setupMaster({ exec: __filename });
  ClusterStore.setup();

  let workersListening = 0;
  cluster.on("listening", function (w, addr) {
    if (!workerUrl) workerUrl = "http://localhost:" + addr.port;

    workersListening++;
    if (workersListening == WORKER_COUNT) {
      done();
    }
  });

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }
}

function stopWorkers(done) {
  cluster.disconnect(done);
}
function startExpressServer() {
  let PORT = 0; // Let the OS pick any available port
  let app = express()
    .use(CookieParser())
    .use(
      Session({
        store: new ClusterStore(),
        secret: "a-secret",
        resave: false,
        saveUninitialized: true,
      })
    )
    .use(BodyParser.json())
    .use(requestHandler);

  let server = http.createServer(app).listen(PORT);

  function requestHandler(req, res) {
    let result = {};
    switch (req.body.cmd) {
      case "set":
        req.session[req.body.key] = req.body.value;
        break;
      case "get":
        result.value = req.session[req.body.key];
        break;
      case "del":
        req.session.destroy();
        break;
    }
    res.setHeader("Content-Type", "text/json");
    res.end(JSON.stringify(result));
  }
}
