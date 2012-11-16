'use strict';

var assert = require('assert');
var events = require('events');
var ffi = require('ffi');
var libs = require('pocketsphinxjs-libs');
var model = require('pocketsphinxjs-model');
var path = require('path');
var ref = require('ref');
var sys = require('sys');
var testdata = require('pocketsphinxjs-testdata');

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
  self.inited = false;
  self.device = 'plughw:0,0';

  self.start = function(cb) {
    assert(!self.inited, 'Already started');
    continuous.init.async(
      self.model.hmm,
      self.model.lm,
      self.model.dict,
      function(err, init) {
        console.log('init completed');
        if(err) {
          console.error(err);
          self.emit('error', err);
          cb(err);
        } else {
          self.init = init;
          self.inited = true;
          self.emit('inited');
        }
      }
    );
    self.once('inited', function() {
      console.log('pocketsphinxjs return callback');
      cb();
    });
  }

  // self.poll = function() {
  //   if(self.hypothesisEmitter) {
  //     console.log('Already polling');
  //     return;
  //   }

  //   console.log('starting polling of hypothesis');
  //   self.hypothesisEmitter = function(err, hypothesis) {
  //     if(err || !hypothesis) {
  //       if(err) {
  //         console.error(err);
  //         emit('error', err);
  //       }
  //       console.error('stopping polling for hypothesis');
  //       self.hypothesisEmitter = null;
  //       return;
  //     }
  //     if(!self.inited) {
  //       console.error('not inited, stop polling');
  //       self.hypothesisEmitter = null;
  //       return;
  //     }
  //     console.log('emitting ' + hypothesis)
  //     self.emit('hypothesis', hypothesis);
  //     continuous.get_next_hypothesis.async(self.init, self.hypothesisEmitter);
  //   }
  //   continuous.get_next_hypothesis.async(self.init, self.hypothesisEmitter);
  // }

  self.recognizeFromFile = function(filename) {
    assert(filename);
    assert(self.inited, 'cannot recognize if process not started');
    continuous.recognize_from_file.async(self.init, filename, function(err) {
      if(err) {
        console.error(err);
        emit('error', err);
      }
    });
  }

  self.recognizeFromMicrophone = function(cb) {
    assert(self.inited, 'cannot recognize if process not started');
    continuous.recognize_from_microphone.async(self.init, self.device, function(err) {
      if(err) {
        console.error(err);
        emit('error', err);
      }
    });
    continuous.wait_ready.async(self.init, function() {
      console.log('recognizeFromMicrophone: wait ready returned');
      cb();
    });
  }

  self.stop = function(cb) {
    assert(self.inited, 'Cannot stop if not started');
    self.inited = false;
    continuous.stop.async(self.init, cb);
  }

  self.getNextHypothesis = function(cb)  {
    //assert(self.inited, 'Not started');
    // console.log('getting next hypothesis')
    // self.once('hypothesis', function(hypothesis) {
    //   console.log('got hypothesis ' + hypothesis)
    //   cb(null, hypothesis);
    // });
    if(!self.inited) {
      self.once('inited', function() {
        continuous.wait_ready.async(self.init, function() {
          console.log('getNextHypothesis 1: wait ready returned');
          continuous.get_next_hypothesis.async(self.init, cb);
        });
      })
    } else {
      continuous.wait_ready.async(self.init, function() {
        console.log('getNextHypothesis 2: wait ready returned');
        continuous.get_next_hypothesis.async(self.init, cb);
      });
    }
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
