define(['promenade', 'promenade/queue'],
       function(Promenade, QueueApi) {

  describe('Promenade.Queue', function() {
    it('is defined', function() {
      expect(Promenade.Queue).to.be.ok();
      expect(QueueApi).to.be.ok();
    });

    describe('when applied to an object', function() {
      it('exposes a basic promise abstraction');

      describe('and a queue is looked up', function() {
        it('creates a queue that does not exist');
        it('returns a queue that has been created');
        it('defaults to returning the default queue');
      });

      describe('and a queue is pushed to', function() {
        it('creates that queue if it does not exist');
        describe('that has queued operations', function() {
          it('runs the pushed operation after all previously queued operations');
        });
      });

      describe('and the queue completes', function() {
        it('resolves the queue\'s completion promise');
      });
    });
  });
});
