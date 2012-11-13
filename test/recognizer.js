'use strict';

var assert = require('should');
var pocketsphinxjs = require('pocketsphinxjs');
var testdata = require('pocketsphinxjs-testdata');
describe('audio', function() {

  it('played audio is recognized', function(done) {
    this.timeout(20000);
    pocketsphinxjs.once('ready', function() {
      testdata.play(testdata.GOFORWARD_RAW, function(err, message) {
        if(err) done(dnodeloader.err(err));
      });
    });

    pocketsphinxjs.start();
    pocketsphinxjs.getNextHypothesis(function(err, hypothesis) {
      if(err) return done(err);
      pocketsphinxjs.stop();
      hypothesis.should.equal('go forward ten meters');
      done();
    });
  });
});

