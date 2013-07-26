define(['backbone', 'promenade', 'promenade/controller', 'promenade/application'],
       function(Backbone, Promenade, Controller, Application) {

  describe('Promenade.Controller', function() {

    var MyController;
    var MyModel;
    var MyCollection;
    var MyApplication;
    var app;

    beforeEach(function() {
      MyController = Promenade.Controller.extend({
        defineRoutes: function() {
          this.handle('foo', 'foo');
          this.handle('bar', 'bar', function() {
            this.resource('baz', 'barBaz');
          });
          this.resource('foo', 'receivesBar', function() {
            this.resource('lur', 'receivesBarAndModel');
          });
          this.resource('lur', 'receivesModel');
        },
        foo: function() {},
        bar: function() {},
        barBaz: function(baz) {},
        receivesBar: function(bar) {},
        receivesModel: function(model) {},
        receivesBarAndModel: function(bar, model) {}
      });
      MyModel = Promenade.Model.extend({
        namespace: 'foo',
        defaults: {
          bar: 'baz'
        }
      });
      MyCollection = Promenade.Collection.extend({
        namespace: 'lur'
      });
      MyApplication = Application.extend({
        controllers: [
          MyController
        ],
        models: [
          MyModel,
          MyCollection
        ]
      });
      app = new MyApplication();
      Backbone.history.start();
    });

    afterEach(function() {
      Backbone.history.stop();
      Backbone.history.handlers = [];
    });

    it('is defined', function() {
      expect(Promenade.Controller).to.be.ok();
      expect(Controller).to.be.ok();
    });

    describe('when instantiated', function() {

      var myController;

      beforeEach(function() {
        myController = new MyController(app);
      });

      it('defines a series of routes', function() {
        var count = 0;
        for (var routeString in myController.routes) {
          ++count;
        }
        expect(count).to.be.eql(6);
      });
    });

    describe('when a navigation event occurs', function() {
      describe('for a resource', function() {
        beforeEach(function() {
          sinon.spy(app.controllers[0], 'receivesBar');
          sinon.spy(app.controllers[0], 'receivesModel');
          sinon.spy(app.controllers[0], 'receivesBarAndModel');
          app.lur.reset([{
            id: '1'
          }]);
        });

        afterEach(function() {
          app.controllers[0].receivesBar.restore();
          app.controllers[0].receivesModel.restore();
          app.controllers[0].receivesBarAndModel.restore();
          app.navigate('');
        });

        describe('with an associated model', function() {
          it('passes the model-key value to the handler', function() {
            app.navigate('foo/bar', { trigger: true });
            expect(app.controllers[0].receivesBar.getCall(0).calledWith('baz')).to.be(true);
          });
        });

        describe('with an associated collection', function() {
          it('passes a model with the given id to the handler', function() {
            app.navigate('lur/1', { trigger: true });
            expect(app.controllers[0].receivesModel.getCall(0).calledWith(app.lur.get('1'))).to.be(true);
          });
        });

        describe('with compound associations', function() {
          it('passes a model-key value and a model', function() {
            app.navigate('foo/bar/lur/1', { trigger: true });
            expect(app.controllers[0].receivesBarAndModel.getCall(0).calledWith('baz', app.lur.get('1'))).to.be(true);
          });
        });
      });
    });
  });
});
