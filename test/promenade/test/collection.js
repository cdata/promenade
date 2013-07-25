define(['backbone', 'promenade', 'promenade/collection'],
       function(Backbone, Promenade, Collection) {
  describe('Promenade.Collection', function() {
    it('is defined', function() {
      expect(Promenade.Collection).to.be.ok();
      expect(Collection).to.be.ok();
    });

    describe('when a namespace is declared', function() {
      describe('when we receive data', function() {

        it('extracts namespaced data when parsing');
        it('ignores data in other namesapces');

        describe('and the expected namespace is absent in the data', function() {
          it('throws hard');
        });
      });
    });

    describe('with no namespace declared', function() {
      it('uses the top-level data when parsing');
    });

    describe('when getting a model', function() {
      describe('that does not exist', function() {
        describe('with a model reference', function() {
          it('returns undefined');
        });
        describe('by an id value', function() {
          it('returns a model instance');
          it('calls fetch on the returned model instance');
        });
      });
    });

  });
});
