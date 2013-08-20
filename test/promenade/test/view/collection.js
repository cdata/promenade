define(['promenade', 'promenade/view/collection'],
       function(Promenade, CollectionView) {

  describe('Promenade.CollectionView', function() {

    it('is defined', function() {
      expect(Promenade.CollectionView).to.be.ok();
      expect(CollectionView).to.be.ok();
    });

    describe('when instantiated', function() {

      var myCollection;
      var myCollectionView;

      beforeEach(function() {
        myCollection = new Promenade.Collection([{ val: 1 },
                                                 { val: 2 },
                                                 { val: 3 }]);
        myCollectionView = new CollectionView({
          collection: myCollection
        });
      });

      it('creates an outlet region', function() {
        expect(myCollectionView.outletRegion).to.be.ok();
      });

      describe('with a collection', function() {

        describe('that is empty', function() {
          beforeEach(function() {
            myCollection.reset();
            myCollectionView.render();
          });

          it('adds an empty class to the outlet node', function() {
            expect(myCollectionView.outletRegion.$container.hasClass('empty')).to.be(true);
          });
        });

        describe('that has models in it', function() {

          describe('and rendered', function() {

            beforeEach(function() {
              myCollectionView.render();
            });

            it('creates a view for every model', function() {
              var childNodes = myCollectionView.getRegion('outlet').$container.children();
              var childViews = myCollectionView.getRegion('outlet').subviews;

              expect(childNodes.length).to.be(childViews.length);
              expect(childViews.length).to.be(myCollection.length);
            });
          });
        });

        describe('that has a model added to it', function() {

          it('adds a view to the outlet', function() {
            var numberOfViews = myCollectionView.getRegion('outlet').subviews.length;
            var newNumberOfViews;

            myCollection.add({ val: 4 });

            newNumberOfViews = myCollectionView.getRegion('outlet').subviews.length;

            expect(newNumberOfViews).to.be(numberOfViews + 1);
          });
        });
      });
    });
  });
});
