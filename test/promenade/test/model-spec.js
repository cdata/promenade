define(['promenade', 'promenade/model'],
       function(Promenade, Model) {

  describe('Promenade.Model', function() {

    var MyModel;
    var MyNamespacedModel;
    var AnotherNamespacedModel;
    var ThirdNamespacedModel;
    var server;

    beforeEach(function() {
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/api/foo',
                         [200, {}, '{"foo":{},"bar":{}}']);
      server.respondWith('GET', '/api/foos',
                         [200, {}, '[{ "id": 1 }, { "id": 2 }]']);

      MyModel = Model.extend({
        url: '/api/foo',
        structure: {
          'foo': Model
        }
      });

      MyNamespacedModel = Model.extend({
        urlRoot: '/api',
        url: '/api/bar',
        type: 'bar',
        namespace: 'bars'
      });

      AnotherNamespacedModel = Model.extend({
        urlRoot: '/api',
        type: 'baz',
        namespace: 'bazes'
      });

      ThirdNamespacedModel = Model.extend({
        urlRoot: '/api',
        type: 'vim',
        namespace: 'vims'
      });
    });

    afterEach(function() {
      server.restore();
    });

    it('is defined', function() {
      expect(Promenade.Model).to.be.ok();
      expect(Model).to.be.ok();
    });

    describe('when fetching', function() {
      describe('from an atypical resource location', function() {
        describe('derived from a relationship to other resources', function() {
          var myModel;
          var otherModel;
          var thirdModel;

          beforeEach(function() {
            MyNamespacedModel.url = Model.prototype.url;
            MyNamespacedModel.urlRoot = '/api';

            myModel = new MyNamespacedModel();
            otherModel = new AnotherNamespacedModel({ id: 1 });
            thirdModel = new ThirdNamespacedModel({ id: 2 });
          });

          it('generates urls based on a related model', function() {
            var resourceUrl = myModel.composeUrlFrom(otherModel);

            expect(resourceUrl).to.be('/api/bazes/1/bars');
          });

          it('generates compound urls based on a series of related models', function() {
            var resourceUrl = myModel.composeUrlFrom(otherModel, thirdModel);
            var otherResourceUrl = myModel.composeUrlFrom(thirdModel, otherModel);

            expect(resourceUrl).to.be('/api/bazes/1/vims/2/bars');
            expect(otherResourceUrl).to.be('/api/vims/2/bazes/1/bars');
          });
        });
      });
    });

    describe('before it is synced', function() {
      var myModel;

      beforeEach(function() {
        myModel = new MyModel();
      });

      it('reports that it is not yet synced', function() {
        expect(myModel.hasSynced()).to.be(false);
      });

      it('reports that it is not currently syncing', function() {
        expect(myModel.isSyncing()).to.be(false);
      });

      describe('and then a sync starts', function() {
        beforeEach(function() {
          myModel.fetch();
        });

        it('reports that it is not yet synced', function() {
          expect(myModel.hasSynced()).to.be(false);
        });

        it('reports that it is currently syncing', function() {
          expect(myModel.isSyncing()).to.be(true);
        });

        describe('and the server responds', function() {
          it('resolves the syncing promise', function() {
            var syncResolveCalls = 0;

            // TODO: This test is brittle against the possibility that
            // future promises will resolve on a separate tick..
            myModel.syncs().then(function() {
              syncResolveCalls++;
            });

            expect(syncResolveCalls).to.be(0);

            server.respond();

            expect(syncResolveCalls).to.be(1);
          });
        });
      });
    });

    describe('when there is an associated Application instance', function() {

      var MyApp;
      var MyNamespacedCollection;
      var MyStructuredModel;
      var app;

      beforeEach(function() {
        MyNamespacedCollection = Promenade.Collection.extend({
          namespace: 'foos',
          type: 'foo'
        });

        MyStructuredModel = Promenade.Model.extend({
          namespace: 'vim',
          structure: {
            foos: Backbone.Collection
          }
        });

        MyApp = Promenade.Application.extend({
          models: [
            MyNamespacedCollection,
            MyNamespacedModel,
            MyStructuredModel
          ]
        });

        app = new MyApp();

        app.fooCollection.add([{ id: 1, val: 'a' }, { id: 2, val: 'b' }]);
      });

      describe('and a type is declared', function() {
        it('has an app reference as a class property', function() {
          expect(app.barModel.app).to.be.ok();
          expect(app.barModel.app).to.be(app);
        });
      });


      describe('and there are embedded references in the data', function() {
        beforeEach(function() {
          app.barModel.set({
            foo: {
              id: 1,
              type: 'foo'
            },
            foos: [{
              id: 1,
              type: 'foo'
            }, {
              id: 2,
              type: 'foo'
            }],
            vim: {
              id: 1,
              type: 'vim'
            }
          });
        });

        describe('and a structure is declared', function() {
          beforeEach(function() {
            app.vimModel.set({
              foos: [{
                id: 1,
                type: 'foo'
              }]
            });
          });

          it('creates a type containing embedded references', function() {
            var collection = app.vimModel.get('foos');

            expect(collection).to.be.a(Backbone.Collection);
            expect(collection.at(0)).to.be(app.fooCollection.get(1));
          });

          describe('and the raw value is updated in place', function() {
            it('updates the collection reference in place', function() {
              var collection = app.vimModel.get('foos');
              app.vimModel.set({
                foos: [{
                  id: 2,
                  type: 'foo'
                }]
              });

              expect(collection.length).to.be(1);
              expect(collection.at(0)).to.be(app.fooCollection.get(2));
            });
          });
        });

        describe('when serialized as JSON', function() {
          it('serializes embedded references as well', function() {
            var data = app.barModel.toJSON();

            expect(data).to.be.eql({
              foo: {
                id: 1,
                val: 'a'
              },
              foos: [{
                id: 1,
                val: 'a'
              }, {
                id: 2,
                val: 'b'
              }],
              vim: {
                id: 1,
                type: 'vim'
              }
            });
          });
        });

        describe('which refer to a single model', function() {
          it('retrieves a canonical model instance upon get', function() {
            var valueFromModel = app.barModel.get('foo');
            var valueFromCollection = app.fooCollection.get(1);

            expect(valueFromModel).to.be.ok();
            expect(valueFromCollection).to.be.ok();
            expect(valueFromModel).to.be(valueFromCollection);
          });
        });

        describe('which refer to a set of models', function() {
          it('retreives a set of canonical model instances upon get', function() {
            var valuesFromModel = app.barModel.get('foos');
            var valuesFromCollection = app.fooCollection.get([1, 2]);

            expect(valuesFromModel).to.be.an(Array);
            expect(valuesFromModel.length).to.be(2);

            for (var i = 0; i < valuesFromModel.length; ++i) {
              expect(valuesFromModel[i]).to.be(valuesFromCollection[i]);
            }
          });
        });

        describe('which refer to an unregistered type', function() {
          it('returns the server-sent data representation', function() {
            var valueFromModel = app.barModel.get('vim');
            expect(valueFromModel).to.be.eql({
              id: 1,
              type: 'vim'
            });
          });
        });
      });
    });

    describe('when a model is updated from a resource url', function() {
      var collection;
      var model;

      beforeEach(function() {
        collection = new Promenade.Collection([
          { id: 1 }
        ]);
        model = collection.at(0);
      });

      describe('that it has never been updated from before', function() {

        it('triggers a change event on itself', function() {
          var subset = collection.resource('/api/foos');
          var changeTriggeredCount = 0;

          model.on('change', function() {
            ++changeTriggeredCount;
          });

          subset.fetch();
          server.respond();

          expect(changeTriggeredCount).to.be(1);
        });

        it('triggers a resource event on itself', function() {
          var subset = collection.resource('/api/foos');
          var resourceTriggeredCount = 0;

          model.on('resource', function() {
            ++resourceTriggeredCount;
          });

          subset.fetch();
          server.respond();

          expect(resourceTriggeredCount).to.be(1);
        });
      });
    });


    describe('when a namespace is declared', function() {
      var myModel;
      var data;

      beforeEach(function() {
        myModel = new MyNamespacedModel();
        data = {
          bars: {
            foo: 1
          }
        };
      });

      describe('when we receive data', function() {
        it('extracts only namespaced data when parsing', function() {
          var parsed = myModel.parse(data);

          expect(data.bars).to.be.eql(parsed);
        });

        describe('and the expected namespace is absent in the data', function() {
          it('throws hard', function() {
            var badData = {
              foo: {}
            };
            expect(function() {
              myModel.parse(badData);
            }).to.throwException();
          });
        });
      });
    });


    describe('with no namespace declared', function() {
      var myModel;

      beforeEach(function() {
        myModel = new MyModel();
      });
      it('uses the top-level data when parsing', function() {
        var data = {
          'bar': 1
        };
        expect(myModel.parse(data)).to.be.eql(data);
      });
    });

    describe('when a structure is declared', function() {

      describe('and data is parsed', function() {

        it('converts the appropriate attributes to declared types', function() {
          var myModel = new MyModel();
          myModel.fetch();

          server.respond();

          expect(myModel.get('foo')).to.be.a(Model);
        });
      });

      describe('and values are set', function() {

        it('converts appropriate values to declared types', function() {
          var myModel = new MyModel({
            'foo': {},
            'bar': {}
          });

          expect(myModel.get('foo')).to.be.a(Model);
        });

        it('passes through values that are already instances of declared types', function() {
          var mySubmodel = new Model();
          var myModel = new MyModel({
            'foo': mySubmodel,
            'bar': {}
          });

          expect(myModel.get('foo')).to.be(mySubmodel);
        });
      });

      describe('and state is serialized', function() {

        it('converts declared types to plain objects', function() {
          var myModel = new MyModel({
            'foo': {},
            'bar': {}
          });
          var data = myModel.toJSON();

          expect(data).to.be.eql({
            'foo': {},
            'bar': {}
          });
        });
      });
    });
  });
});
