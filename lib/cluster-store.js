"use strict";
const cluster = require("cluster");
const NativeStore = require("strong-store-cluster");
const session = require("express-session");
function setup() {}

module.exports = class ClusterStore extends session.Store {
  constructor(options) {
    super();
    this.Store = session.Store;
    this.Store.call(this, options);
    this.COLLECTION_NAME = "strong-cluster-express-session-store";
    this._collection = NativeStore.collection(this.COLLECTION_NAME);
  }

  get(sid, fn) {
    this._collection.get(sid, fn);
  }

  set(sid, session, fn) {
    this._collection.set(sid, session, fn);
  }

  destroy(sid, fn) {
    this._collection.del(sid, fn);
  }

  static setup() {
    setup();
  }
};

module.exports.setup = setup;
