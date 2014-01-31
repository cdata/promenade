define(['promenade', 'promenade/queue'],
       function(Promenade, QueueApi) {

  describe('Promenade.Queue', function() {
    it('is defined', function() {
      expect(Promenade.Queue).to.be.ok();
      expect(QueueApi).to.be.ok();
    });

    describe('when applied to an object', function() {
      var queueObject;

      beforeEach(function() {
        queueObject = {};
        _.extend(queueObject, QueueApi);
      });

      it('exposes a basic promise abstraction', function() {
        expect(queueObject.defer).to.be.a(Function);
        expect(queueObject.promise).to.be.a(Function);
        expect(queueObject.when).to.be.a(Function);
      });

      it('exposes a tick helper', function() {
        expect(queueObject.tick).to.be.a(Function);
      });

      describe('and tick is called', function() {
        it('returns a function that calls back asynchronously', function(done) {
          var calls = 0;
          // We need to use an interval because Sinon won't properly stub
          // requestAnimationFrame.
          var interval = 20;
          var date = Date.now();
          var tickFn = queueObject.tick(function() {
            try {
              expect(Date.now() - date).to.be.greaterThan(19);
              done();
            } catch(e) {
              done(e);
            }
          }, interval);

          tickFn();
        });
      });

      describe('and a promise is called', function () {
        var promise;
        
        it('creates a promise', function () {
          promise = queueObject.promise();
          expect(promise.then).to.be.a(Function);
        });

        describe('with a non-promise value', function () {
          it('resolves immeditately', function() {
            promise = queueObject.promise('foo');
            expect(promise.state()).to.be('resolved');
          });
        });

        describe('with a promise', function () {
          var promise2;
          var defer;

          beforeEach(function () {
            defer = queueObject.defer();
            promise2 = defer.promise();
            promise = queueObject.promise(promise2);
          });

          it('remains pending state', function () {
            expect(promise.state()).to.be('pending');
          });

          it('resolves when the promise is resolved', function() {
            expect(promise.state()).to.be('pending');
            defer.resolve('abc');
            expect(promise.state()).to.be('resolved');
          });
        });
      });

      describe('and a queue is looked up', function() {
        it('creates a queue that does not exist', function() {
          var queue = queueObject.getQueue('foo');
          expect(queue).to.be.ok();
        });
        it('returns a queue that has been created', function() {
          queueObject.pushQueue(queueObject.tick(), 'foo');
          queueObject.pushQueue(function() {}, 'foo');

          var queue = queueObject.getQueue('foo');

          expect(queue.length).to.be(1);
        });
        it('defaults to returning the default queue', function() {
          var queue = queueObject.getQueue();

          expect(queue).to.be(queueObject.getQueue('default'));
          expect(queue).to.not.be(queueObject.getQueue('foo'));
        });
      });

      describe('and a queue is pushed to', function() {
        it('creates that queue if it does not exist', function() {
          queueObject.pushQueue(queueObject.tick, 'foo');
          expect(queueObject.getQueue('foo')).to.be.ok();
        });
        describe('that has queued operations', function() {
          var tick;
          var interval;
          var firstOperation;
          var secondOperation;
          var thirdOperation;

          beforeEach(function(done) {
            firstOperation = sinon.spy();
            secondOperation = sinon.spy();
            thirdOperation = sinon.spy();
            interval = 30;

            queueObject.pushQueue(queueObject.tick(function() {
              firstOperation();
            }, interval));
            queueObject.pushQueue(queueObject.tick(function() {
              secondOperation();
            }, interval));
            queueObject.pushQueue(queueObject.tick(function() {
              thirdOperation();
              done();
            }, interval));
          });

          it('runs the pushed operation after all previously queued operations',
             function() {
            expect(thirdOperation.callCount).to.be(1);

            expect(firstOperation.calledBefore(secondOperation)).to.be(true);
            expect(secondOperation.calledBefore(thirdOperation)).to.be(true);
          });

          describe('and the queue completes', function() {
            it('resolves the queue\'s completion promise', function() {
              var completionCount = 0;

              queueObject.queueCompletes().then(function() {
                completionCount++;
              });

              expect(completionCount).to.be(1);
            });
          });
        });
      });

    });
  });
});
