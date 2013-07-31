define(['backbone', 'promenade', 'promenade/collection'],
       function(Backbone, Promenade, Collection) {

  describe('Promenade.Collection', function() {

    it('is defined', function() {
      expect(Promenade.Collection).to.be.ok();
      expect(Collection).to.be.ok();
    });

    describe('when it is associated with an app', function() {
      var MyApp;
      var MyCollection;
      var app;

      beforeEach(function() {
        MyCollection = Promenade.Collection.extend({
          namespace: 'foo',
          type: 'foo'
        });
        MyApp = Promenade.Application.extend({
          models: [ MyCollection ]
        });
        app = new MyApp();
      });

      describe('and a type is declared', function() {

        it('can be found on the app', function() {
          expect(app.fooCollection).to.be.a(MyCollection);
          expect(app.getResource('foo')).to.be.a(MyCollection);
        });

        it('has an app reference as a class property', function() {
          expect(app.fooCollection.app).to.be.ok();
          expect(app.fooCollection.app).to.be(app);
        });

        it('creates new models with an app property', function() {
          app.fooCollection.add({ id: 1 });
          expect(app.fooCollection.get(1).app).to.be.ok();
          expect(app.fooCollection.get(1).app).to.be(app);
        });
      });

      describe('and a namespace is declared', function() {

        describe('when we receive data', function() {
          var collection;
          var data;

          beforeEach(function() {
            collection = new MyCollection();
            data = {
              foo: {},
              bar: {}
            };
          });

          it('extracts namespaced data when parsing', function() {
            expect(collection.parse(data)).to.be.eql(data.foo);
          });

          describe('and the expected namespace is absent in the data', function() {
            it('throws hard', function() {
              var badData = {
                bar: {}
              };
              expect(function() {
                collection.parse(badData);
              }).to.throwException();
            });
          });
        });
      });
    });

    describe('when a subset is requested', function() {
      var superset;
      var subset;

      beforeEach(function() {
        superset = new Collection();
        for (var i = 0; i < 10; ++i) {
          superset.add({ id: i });
        }

        subset = superset.subset(function(model) {
          return window.parseInt(model.id, 10) > 4;
        });
      });

      it('yields a Collection with existing items matching the filter', function() {
        expect(subset).to.be.a(Collection);
        expect(subset.length).to.be(5);
      });

      it('does not remove items from the superset by being created', function() {
        expect(superset.length).to.be(10);
      });

      it('updates the subset when items are added to the superset', function() {
        superset.add({ id: 11 });

        expect(subset.length).to.be(6);
        expect(superset.length).to.be(11);
        expect(subset.get(11)).to.be(superset.get(11));
      });

      it('does not update the subset when items are added that do not match the filter', function() {
        superset.add({ id: -1 });

        expect(subset.length).to.be(5);
        expect(superset.length).to.be(11);
        expect(subset.get(-1)).to.not.be.ok();
        expect(superset.get(-1)).to.be.ok();
      });
      
      it('updates the subset when items are removed from the superset', function() {
        superset.remove(5);

        expect(superset.get(5)).to.not.be.ok();
        expect(subset.get(5)).to.not.be.ok();
        expect(subset.length).to.be(4);
      });

      it('updates the superset when items are added to the subset', function() {
        subset.add({ id: 11 });

        expect(superset.length).to.be(11);
        expect(subset.length).to.be(6);
        expect(superset.get(11)).to.be(subset.get(11));
      });

      it('updates the superset when items are removed from the subset', function() {
        subset.remove(5);

        expect(superset.get(5)).to.not.be.ok();
        expect(superset.length).to.be(9);
        expect(subset.get(5)).to.not.be.ok();
        expect(subset.length).to.be(4);
      });
    });

    describe('with no namespace declared', function() {
      var MyCollection;
      var collection;

      beforeEach(function() {
        MyCollection = Promenade.Collection.extend();
        collection = new MyCollection();
      });

      it('uses the top-level data when parsing', function() {
        var data = {
          foo: 1
        };

        expect(collection.parse(data)).to.be.eql(data);
      });
    });

    describe('when getting a model', function() {
      var MyCollection;
      var collection;

      beforeEach(function() {
        MyCollection = Promenade.Collection.extend({
          url: 'foo',
          model: Backbone.Model
        });
        collection = new MyCollection();
      });

      describe('by a list of lookup values', function() {
        var doesNotExist;

        beforeEach(function() {
          collection.add({ id: 0 }, { id: 1 }, { id: 2 });
          doesNotExist = { id: 4 };
        });

        it('returns the set of models in an array', function() {
          var models = collection.get([0, 1, collection.get(2)]);

          expect(models[0]).to.be.ok();
          expect(models[0]).to.be(collection.get(0));
          expect(models[1]).to.be.ok();
          expect(models[1]).to.be(collection.get(1));
          expect(models[2]).to.be.ok();
          expect(models[2]).to.be(collection.get(2));
        });

        it('returns undefined for lookup value indices for which models are not found', 
           function() {
          var model = collection.get(doesNotExist);

          expect(model).not.to.be.ok();
        });
      });

      describe('that does not exist', function() {
        describe('when no collection url is specified', function() {
          beforeEach(function() {
            collection.url = null;
          });
          it('returns undefined', function() {
            expect(collection.get(100)).to.be(undefined);
          });
        });
        describe('with a model reference', function() {
          it('returns undefined', function() {
            expect(collection.get(new Promenade.Model())).to.be(undefined);
          });
        });
        describe('by an id value', function() {
          it('returns a model instance', function() {
            expect(collection.get(1)).to.be.a(Backbone.Model);
          });
          it('calls fetch on the returned model instance', function() {
            sinon.spy(Backbone.Model.prototype, 'fetch');
            collection.get(1);
            expect(Backbone.Model.prototype.fetch.callCount).to.be(1);
          });
        });
      });
    });
  });
});
