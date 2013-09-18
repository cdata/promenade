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

      describe('and a queue is looked up', function() {
        it('creates a queue that does not exist', function() {
          var queue = queueObject.getQueue('foo');
          expect(queue).to.be.ok();
        });
        it('returns a queue that has been created', function() {
          queueObject.pushQueue(queueObject.tick, 'foo');
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
          var firstOperation;
          var secondOperation;
          var thirdOperation;

          beforeEach(function() {
            clock = sinon.useFakeTimers();

            firstOperation = sinon.spy();
            secondOperation = sinon.spy();
            thirdOperation = sinon.spy();
            tick = function(fn) {
              return function() {
                var result = queueObject.defer();

                setTimeout(function() {
                  fn();
                  result.resolve();
                }, 0);

                return result.promise();
              };
            };

            queueObject.pushQueue(tick(function() {
              firstOperation();
            }));
            queueObject.pushQueue(tick(function() {
              secondOperation();
            }));
            queueObject.pushQueue(tick(function() {
              thirdOperation();
            }));
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
