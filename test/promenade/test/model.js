define(['promenade', 'promenade/model'],
       function(Promenade, Model) {

  describe('Promenade.Model', function() {

    var MyModel;
    var MyNamespacedModel;
    var server;

    beforeEach(function() {
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/api/foo',
                         [200, {}, '{"foo":{},"bar":{}}']);

      MyModel = Model.extend({
        url: '/api/foo',
        types: {
          'foo': Model
        }
      });

      MyNamespacedModel = Model.extend({
        url: '/api/bar',
        namespace: 'bar'
      });
    });

    afterEach(function() {
      server.restore();
    });

    it('is defined', function() {
      expect(Promenade.Model).to.be.ok();
      expect(Model).to.be.ok();
    });


    describe('when there is an associated Application instance', function() {

      var MyApp;
      var MyNamespacedCollection;
      var app;

      beforeEach(function() {
        MyNamespacedCollection = Promenade.Collection.extend({
          namespace: 'foos'
        });

        MyApp = Promenade.Application.extend({
          models: [
            MyNamespacedCollection,
            MyNamespacedModel
          ]
        });

        app = new MyApp();

        app.foos.add([{ id: 1, val: 'a' }, { id: 2, val: 'b' }]);
      });

      describe('and there are embedded references in that data', function() {
        beforeEach(function() {
          app.bar.set({
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

        it('serializes JSON with embedded references serialized as well', function() {
          var data = app.bar.toJSON();

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

        describe('which refer to a single model', function() {
          it('retrieves a canonical model instance upon get', function() {
            var valueFromModel = app.bar.get('foo');
            var valueFromCollection = app.foos.get(1);

            expect(valueFromModel).to.be.ok();
            expect(valueFromCollection).to.be.ok();
            expect(valueFromModel).to.be(valueFromCollection);
          });
        });

        describe('which refer to a set of models', function() {
          it('retreives a set of canonical model instances upon get', function() {
            var valuesFromModel = app.bar.get('foos');
            var valuesFromCollection = app.foos.get([1, 2]);

            expect(valuesFromModel).to.be.an(Array);
            expect(valuesFromModel.length).to.be(2);

            for (var i = 0; i < valuesFromModel.length; ++i) {
              expect(valuesFromModel[i]).to.be(valuesFromCollection[i]);
            }
          });
        });

        describe('which refer to an unregistered type', function() {
          it('returns the server-sent data representation', function() {
            var valueFromModel = app.bar.get('vim');
            expect(valueFromModel).to.be.eql({
              id: 1,
              type: 'vim'
            });
          });
        });
      });
    });


    describe('when a namespace is declared', function() {
      var myModel;
      var data;

      beforeEach(function() {
        myModel = new MyNamespacedModel();
        data = {
          bar: {
            foo: 1
          }
        };
      });

      describe('and it is associated with an app', function() {
        var MyApp;
        var app;

        beforeEach(function() {
          MyApp = Promenade.Application.extend({
            models: [ MyNamespacedModel ]
          });
          app = new MyApp();
        });

        it('has an app reference as a class property', function() {
          expect(app.bar.app).to.be.ok();
          expect(app.bar.app).to.be(app);
        });
      });

      describe('when we receive data', function() {
        it('extracts only namespaced data when parsing', function() {
          var parsed = myModel.parse(data);

          expect(data.bar).to.be.eql(parsed);
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

    describe('when types are declared', function() {

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
