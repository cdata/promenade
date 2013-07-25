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
