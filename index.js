'use strict';

var ffi = require('ffi');
var path = require('path');
var sys = require('sys');
var events = require('events');
var model = require('pocketsphinxjs-model');
var testdata = require('pocketsphinxjs-testdata');
var libs = require('pocketsphinxjs-libs');
var assert = require('assert');
var ref = require('ref');

var continuous = ffi.Library(libs.LIBPATH, {
   'init': ['pointer', [
      'string', // hmm
      'string', // lm
      'string', // dict
      ]
    ],
   'get_next_hypothesis': ['string', ['pointer']],
   'stop': ['void', ['pointer']],
   'recognize_from_microphone': ['void', ['pointer', 'string']],
   'recognize_from_file': ['void', ['pointer', 'string']],
   'wait_ready': ['int', ['pointer']],
 });

function Recognizer(model) {
  var self = this;
  self.model = model;
  self.hypothesisEmitter = null;
  self.started = false;
  self.device = 'plughw:0,0';

  self.start = function(filename) {
    assert(!self.started, 'Already started');
    self.started = true;
    continuous.init.async(
      self.model.hmm,
      self.model.lm,
      self.model.dict,
      function(err, init) {
        self.init = init;
        if(err) {
          console.error(err);
          self.emit('error', err);
        }
        continuous.wait_ready.async(self.init, function(err, isReady) {
          if(isReady)
            self.emit('ready');
          else
            self.emit('error', new Error('wait_ready: was waiting but never became READY'));
        });

        if(filename) {
          continuous.recognize_from_file.async(self.init, filename, function(err) {
            if(err)
              emit('error', err);
          });
        } else {
          continuous.recognize_from_microphone.async(self.init, self.device, function(err) {
            if(err)
              emit('error', err);
          });
        }
      }
    );
    self.on('ready', function() {
        console.log('starting polling of hypothesis');
        self.hypothesisEmitter = function(err, hypothesis) {
          if(err || !hypothesis) {
            if(err) {
              console.error(err);
              emit('error', err);
            }
            console.error('stopping polling for hypothesis');
            self.hypothesisEmitter = null;
            return;
          }
          console.log('emitting ' + hypothesis)
          self.emit('hypothesis', hypothesis);
          continuous.get_next_hypothesis.async(self.init, self.hypothesisEmitter);
        }
        continuous.get_next_hypothesis.async(self.init, self.hypothesisEmitter);
    });
  }

  self.stop = function() {
    assert(self.started, 'Cannot stop if not started');
    continuous.stop(self.init);
    self.started = false;
  }

  self.getNextHypothesis = function(cb)  {
    assert(self.started, 'Not started');
    console.log('getting next hypothesis')
    self.once('hypothesis', function(hypothesis) {
      console.log('got hypothesis ' + hypothesis)
      cb(null, hypothesis);
    });
  }

  self.startOnReady = function(cb)  {
    assert(!self.started, 'Already started');

    self.once('error', function(err) {
      console.error('error ' + err)
      cb(err);
    })
    self.once('ready', function() {
      console.log('callback for ready')
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
