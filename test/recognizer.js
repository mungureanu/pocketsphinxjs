'use strict';

var assert = require('should');
var pocketsphinxjs = require('pocketsphinxjs');
var testdata = require('pocketsphinxjs-testdata');
describe('audio', function() {
  function testTurtleModel(done) {
    pocketsphinxjs.startOnReady(function(err) {
      if(err) return done(err);
      console.log('ready');
      pocketsphinxjs.getNextHypothesis(function(err, hypothesis) {
        if(err) return done(err);
        console.log('hypothesis received');
        pocketsphinxjs.stop();
        hypothesis.should.equal('go forward ten meters');
        done();
      });
      testdata.play(testdata.GOFORWARD_RAW, function(err, message) {
        if(err) return done(err);
        console.log('played test audio');
      });
    });
  }

  it('played audio is recognized', function(done) {
    this.timeout(30000);
    testTurtleModel(done);
  });

  it('recognition can successfully be restarted', function(done) {
    this.timeout(30000);
    testTurtleModel(done);
  });
});

