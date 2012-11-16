'use strict';

var assert = require('should');
var pocketsphinxjs = require('pocketsphinxjs');
var testdata = require('pocketsphinxjs-testdata');
var os = require('os');

describe('audio', function() {
  var filename = testdata.GOFORWARD_RAW;

  function checkHypothesis(done) {
    pocketsphinxjs.getNextHypothesis(function(err, hypothesis) {
      if(err) return done(err);
      console.log('TEST: hypothesis received');
      hypothesis.should.equal('go forward ten meters');
      pocketsphinxjs.stop(done);
    });
  }

  function playAudio() {
    testdata.play(filename, function(err, message) {
      if(err) return done(err);
      console.log('TEST: played test audio');
    });
  }

  function startRecognition() {
    pocketsphinxjs.start(function(err) {
      if(err) return done(err);
      console.log('TEST: before completed - ready');
      if(os.hostname().indexOf('lophilo') != -1) {
        pocketsphinxjs.recognizeFromMicrophone(function(err) {
          if(err) throw new Error(err);
          playAudio();
        });
      } else {
        pocketsphinxjs.recognizeFromFile(filename);
      }
    });
  }

  beforeEach(function() {
    console.log('TEST: >>>>>>>>>>>>>>>>>>>>>>>');
  });

  it('played audio is recognized', function(done) {
    checkHypothesis(done);
    startRecognition();
  });

  it('recognition can successfully be restarted', function(done) {
    checkHypothesis(done);
    startRecognition();
  });

  afterEach(function() {
    console.log('TEST: <<<<<<<<<<<<<<<<<<<<<<<<');
  });

});

