define(['promenade', 'promenade/view/collection'],
       function(Promenade, CollectionView) {

  describe('Promenade.CollectionView', function() {

    it('is defined', function() {
      expect(Promenade.CollectionView).to.be.ok();
      expect(CollectionView).to.be.ok();
    });

    describe('when instantiated', function() {
      var myCollection;
      var MyCollectionView;
      var myCollectionView;

      beforeEach(function() {
        myCollection = new Promenade.Collection([{ val: 1 },
                                                 { val: 2 },
                                                 { val: 3 }]);

        MyCollectionView = CollectionView.extend({
          loadingClass: Promenade.View
        });

        myCollectionView = new MyCollectionView({
          collection: myCollection
        });
      });

      it('creates an outlet region', function() {
        expect(myCollectionView.outletRegion).to.be.ok();
      });

      describe('with a collection', function() {

        describe('that is fetched', function() {
          var server;

          beforeEach(function() {
            server = sinon.fakeServer.create();
            server.respondWith('GET', '/api/foo',
                               [ 200,
                               { 'Content-Type': 'application/json' },
                               '[]' ]);

            myCollection.url = '/api/foo';
          });

          afterEach(function() {
            server.restore();
          });

          describe('when a loading view is defined', function() {
            it('says it has a loading view', function() {
              expect(myCollectionView.hasLoadingView()).to.be(true);
            });

            it('shows the loading view when collection syncs', function() {
              expect(myCollectionView.getRegion('loading').subviews.length).to.be(0);
              myCollection.fetch();
              expect(myCollectionView.getRegion('loading').subviews.length).to.be(1);
              server.respond();
              expect(myCollectionView.getRegion('loading').subviews.length).to.be(0);
            });
          });
        });

        describe('that has no type', function() {
          it('adds no data attribute for type', function(){
            expect(myCollectionView.$el.attr('data-type')).to.be(undefined);
          });
        });

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
            var childViews;
            var childNodes;

            beforeEach(function() {
              myCollectionView.render();
              childNodes = myCollectionView.getRegion('outlet').$container.children();
              childViews = myCollectionView.getRegion('outlet').subviews;
            });

            it('creates a view for every model', function() {
              expect(childNodes.length).to.be(childViews.length);
              expect(childViews.length).to.be(myCollection.length);
            });

            it('has can be referenced by the child views', function () {
              expect(childViews[0].parentView).to.be(myCollectionView);
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

    describe('when instantiated with a model that has a type', function() {
      var BarModel;
      var MyCollection;
      var myCollection;
      var MyCollectionView;
      var myCollectionView;

      beforeEach(function() {
        BarModel = Promenade.Model.extend({
          type: 'bar'
        });

        MyCollection = Promenade.Collection.extend({
          namespace: 'bars',
          model: BarModel
        });

        myCollection = new MyCollection([{ val: 1 },
          { val: 2 },
          { val: 3 }]);

        MyCollectionView = CollectionView.extend({
          loadingClass: Promenade.View
        });

        myCollectionView = new MyCollectionView({
          collection: myCollection
        });
      });

      it('adds collection type data attributes to the root element', function() {
        expect(myCollectionView.$el.attr('data-type')).to.be('bar');
      });
    });
  });
});
