# strong-cluster-express-store-next

# Overview

![tests](https://github.com/Ray0907/strong-cluster-express-store-next/actions/workflows/test.yml/badge.svg)
![license](https://img.shields.io/github/license/Ray0907/strong-cluster-express-store-next)

strong-cluster-express-store-next based on [strong-cluster-express-store](https://www.npmjs.com/package/strong-cluster-express-store) (Rewrite with ES6 class method) extends the functionality of the express-session store using node's native cluster messaging. It provides an easy way for using sessions in express-based applications running in a node cluster.

# Installation

```
$ npm install strong-cluster-express-store-next
```

# Configuration for Express

```
let express = require('express');
let cookieParser = require('cookie-parser');
let session = require('express-session');
let bodyParser = require('body-parser');
let ClusterStore = require('strong-cluster-express-store')(session);

let app = express();
app.use(cookieParser());

app.use(
session({
    store: new ClusterStore(session),
    secret: "SECRET",
    resave: false,
    saveUninitialized: true,
})
);
```

# Setting up the master process

```
// The master process only executes this code
let cluster = require('cluster');
let numCPUs = require('os').cpus().length;

let ClusterStore = require('strong-cluster-express-store');

require('strong-cluster-express-store').setup();

// fork the workers
for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
}
// workers and master run from this point onward

// setup the workers
if (cluster.isWorker) {
    [...]
}
```

# Using strong-cluster-express-store

```
"use strict";
let express = require("express");
let cluster = require("cluster");
let numCPUs = require("os").cpus().length;
let session = require("express-session");
let cookieParser = require("cookie-parser");
let ClusterStore = require("strong-cluster-express-store-next");

if (cluster.isMaster) {
  // The cluster master executes this code
  ClusterStore.setup();

  // Create a worker for each CPU
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("online", function (worker) {
    console.log("Worker " + worker.id + " is online.");
  });

  cluster.on("exit", function (worker, code, signal) {
    console.log("worker " + worker.id + " died with signal", signal);
  });
} else {
  // The cluster workers execute this code

  let app = express();
  app.use(cookieParser());

  app.use(
    session({
      store: new ClusterStore(session),
      secret: "super-cool",
      resave: false,
      saveUninitialized: true,
    })
  );

  app.get("/hello", function (req, res) {
    let msg;
    if (req.session.visited)
      msg = { msg: "Hello again from worker " + cluster.worker.id };
    else msg = { msg: "Hello from worker " + cluster.worker.id };

    req.session.visited = "1";
    res.status(200).json(msg);
  });
  app.listen(3000);
}
```
