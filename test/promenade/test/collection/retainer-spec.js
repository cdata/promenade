define(['backbone', 'promenade', 'promenade/collection/retainer'],
       function(Backbone, Promenade, RetainerApi) {

  describe('Promenade.Collection.Retainer', function() {

    it('is defined', function() {
      expect(Promenade.Collection.Retainer).to.be.ok();
      expect(RetainerApi).to.be.ok();
    });

    describe('when retaining a collection', function() {
      var SomeCollection;
      var someCollection;
      var someSubset;
      var MyRetainer;
      var myRetainer;

      beforeEach(function() {
        SomeCollection = Promenade.Collection.extend();
        someCollection = new SomeCollection();

        for (var i = 0; i < 10; ++i) {
          someCollection.add({ id: i });
        }

        MyRetainer = Promenade.Object.extend(RetainerApi);
        myRetainer = new MyRetainer();

        someSubset = someCollection.subset(function(model) {
          return model.id < 5;
        });
      });

      describe('and the collection is not a subset', function() {
        it('does nothing', function() {
          expect(myRetainer.retains(someCollection)).to.be(someCollection);
          expect(myRetainer._connections).to.not.be.ok();

          expect(someSubset.length).to.be(0);
          expect(someSubset.isConnected()).to.be(false);
        });
      });

      describe('and the collection is a subset', function() {
        beforeEach(function() {
          myRetainer.retains(someSubset);
        });

        afterEach(function() {
          myRetainer.releaseConnections();
        });

        it('connects the subset to its superset', function() {
          expect(someSubset.length).to.be(5);
          expect(someSubset.isConnected()).to.be(true);
          expect(myRetainer._connections[someSubset.cid]).to.be.ok();
        });

        describe('when connections are released', function() {
          beforeEach(function() {
            myRetainer.releaseConnections();
          });

          it('closes the connection between the subset and its superset', function() {
            expect(someSubset.length).to.be(0);
            expect(someSubset.isConnected()).to.be(false);

            expect(myRetainer._connections).to.be.eql({});
          });
        });
      });
    });
  });
});

