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
        var clock;

        beforeEach(function() {
          clock = sinon.useFakeTimers();
        });

        afterEach(function() {
          clock.restore();
        });

        it('returns a function that calls back asynchronously', function() {
          var calls = 0;
          // We need to use an interval because Sinon won't properly stub
          // requestAnimationFrame.
          //
          window.setTimeout = function() {
            console.log('NOOP');
          };

          var interval = 20;
          var tickFn = queueObject.tick(function() {
            console.log('tick fn');
            ++calls;
          }, interval);


          clock.tick(interval);
          expect(calls).to.be(0);

          tickFn();
          expect(calls).to.be(0);
          clock.tick(interval);
          console.log('end of test');
          expect(calls).to.be(1);

          tickFn();
          expect(calls).to.be(1);
          clock.tick(interval);
          expect(calls).to.be(2);
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
          var clock;
          var tick;
          var interval;
          var firstOperation;
          var secondOperation;
          var thirdOperation;

          beforeEach(function() {
            clock = sinon.useFakeTimers();

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
            }, interval));
          });

          afterEach(function() {
            clock.restore();
          });

          it('runs the pushed operation after all previously queued operations',
             function() {
            expect(thirdOperation.callCount).to.be(0);

            clock.tick(100);

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

              expect(completionCount).to.be(0);

              clock.tick(100);

              expect(completionCount).to.be(1);
            });
          });
        });
      });

    });
  });
});
