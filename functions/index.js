const functions = require('firebase-functions');
const next = require('next');
const express = require('express');

const app = express();
const nextApp = next({
  dev: false,
  conf: {
    distDir: '.next'
  }
});
const handle = nextApp.getRequestHandler();

exports.nextServer = functions.https.onRequest((req, res) => {
  return nextApp.prepare()
    .then(() => handle(req, res))
    .catch(error => {
      console.error(error);
      res.status(500).end('Internal Server Error');
    });
});