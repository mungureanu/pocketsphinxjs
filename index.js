var ffi = require('ffi');
var path = require('path');
var sys = require('sys');
var events = require('events');
var model = require('pocketsphinxjs-model');
var testdata = require('pocketsphinxjs-testdata');
var libs = require('pocketsphinxjs-libs');

function Recognizer(model) {
  var self = this;
  self.model = model;

  var continuous = ffi.Library(libs.LIBPATH, {
     'start': ["string", [
        'string', // hmm
        'string', // lm
        'string', // dict
        'string'  // filename
        ]
      ],
     'getLatestHypothesis': ['string', []],
     'stop': ['void', []],
     'waitReady': ['int', []],
     //'reset': ['void', []],
   });

  self.start = function(filename) {
    continuous.start.async(
      self.model.hmm,
      self.model.lm,
      self.model.dict,
      filename,
      function(err, recognizerErr) {
        if(err) {
          self.emit('error', err);
        }
        if(recognizerErr) {
          self.emit('error', new Error(recognizerErr));
        }
        self.emit('stopped');
      }
    );

    continuous.waitReady.async(function(err, isReady) {
      console.log(arguments);
      if(isReady)
        self.emit('ready');
      else
        console.error('waitReady: was waiting but never become READY');
    });

    var hypothesisEmitter = function(err, hypothesis) {
      self.emit('hypothesis', hypothesis);
      continuous.getLatestHypothesis.async(hypothesisEmitter);
    }
    continuous.getLatestHypothesis.async(hypothesisEmitter);
  }

  self.stop = function() {
    continuous.stop();
  }

  self.getNextHypothesis = function(cb)  {
    self.once('hypothesis', function(hypothesis) {
      cb(null, hypothesis);
    });
  }

  self.startOnReady = function(cb)  {
    self.once('error', function(err) {
      cb(err);
    })
    self.once('ready', function() {
      cb();
    });
    self.start();
  }

  events.EventEmitter.call(this);
}
sys.inherits(Recognizer, events.EventEmitter);

if(require.main === module) {
  var recognizer = new Recognizer(model.TURTLE_MODEL);

  recognizer.on('error', function(err) {
    console.error('pocketsphinxjs ' + err);
  });

  recognizer.on('stopped', function() {
    console.log('continuous recognition exited');
    process.exit(0);
  });

  process.on('SIGINT', function() {
    console.log('CTRL-C caught, exiting');
    recognizer.stop();
  });

  recognizer.on('hypothesis', function(hypothesis) {
    console.log('pocketsphinxjs: ' + hypothesis);
  });

  console.log('starting recognizer');
  //recognizer.start(testdata.GOFORWARD_RAW);
  recognizer.start();
} else {
  module.exports = new Recognizer(model.TURTLE_MODEL);
}
