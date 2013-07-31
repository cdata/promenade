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
          this.resource('lur', function() {
            this.resource('bing', 'receivesModelAndModel', { type: 'lur' });
          });
        },
        foo: function() {},
        bar: function() {},
        barBaz: function(baz) {},
        receivesBar: function(bar) {},
        receivesModel: function(model) {},
        receivesBarAndModel: function(bar, model) {},
        receivesModelAndModel: function(modelOne, modelTwo) {}
      });
      MyModel = Promenade.Model.extend({
        namespace: 'foo',
        type: 'foo',
        defaults: {
          bar: 'baz'
        }
      });
      MyCollection = Promenade.Collection.extend({
        namespace: 'lur',
        type: 'lur'
      });
      MyApplication = Application.extend({
        controllers: [
          MyController,
          Controller.extend({
            defineRoutes: function() {
              this.handle('grog', 'onGrog');
            },
            onGrog: function() {}
          })
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
        myController = new MyController({ app: app });
      });

      it('defines a series of routes', function() {
        var count = 0;
        for (var routeString in myController.routes) {
          ++count;
        }
        expect(count).to.be.eql(7);
      });
    });

    describe('when a navigation event occurs', function() {
      describe('for a resource', function() {
        beforeEach(function() {
          sinon.spy(app.controllers[0], 'receivesBar');
          sinon.spy(app.controllers[0], 'receivesModel');
          sinon.spy(app.controllers[0], 'receivesBarAndModel');
          sinon.spy(app.controllers[0], 'receivesModelAndModel');
          sinon.spy(app.controllers[0], 'activate');
          sinon.spy(app.controllers[0], 'deactivate');
          app.lurCollection.reset([{
            id: '1'
          }]);
        });

        afterEach(function() {
          app.controllers[0].receivesBar.restore();
          app.controllers[0].receivesModel.restore();
          app.controllers[0].receivesBarAndModel.restore();
          app.controllers[0].receivesModelAndModel.restore();
          app.controllers[0].activate.restore();
          app.controllers[0].deactivate.restore();
          app.navigate('');
        });

        it('calls its own activate method when the route first matches', function() {
          expect(app.controllers[0].activate.callCount).to.be(0);
          app.navigate('foo/bar', { trigger: true });  
          expect(app.controllers[0].activate.callCount).to.be(1);
          app.navigate('lur/1', { trigger: true });
          expect(app.controllers[0].activate.callCount).to.be(1);
        });

        it('calls its own deactivate method when the route no longer matches', function() {
          expect(app.controllers[0].deactivate.callCount).to.be(0);
          app.navigate('foo/bar', { trigger: true });  
          expect(app.controllers[0].deactivate.callCount).to.be(0);
          app.navigate('grog', { trigger: true });
          expect(app.controllers[0].deactivate.callCount).to.be(1);
        });

        describe('with an associated model', function() {
          it('passes the model-key value to the handler', function() {
            app.navigate('foo/bar', { trigger: true });
            expect(app.controllers[0].receivesBar.getCall(0).calledWith('baz'))
                .to.be(true);
          });
        });

        describe('with an associated collection', function() {
          it('passes a model with the given id to the handler', function() {
            app.navigate('lur/1', { trigger: true });
            expect(app.controllers[0].receivesModel.getCall(0).calledWith(
                app.lurCollection.get('1'))).to.be(true);
          });
        });

        describe('with compound associations', function() {
          it('passes a model-key value and a model', function() {
            app.navigate('foo/bar/lur/1', { trigger: true });
            expect(app.controllers[0].receivesBarAndModel.getCall(0).calledWith(
                'baz', app.lurCollection.get('1'))).to.be(true);
          });
        });

        describe('when an optional type is specified', function() {
          it('uses that type to resolve the resource instead of the fragment',
             function() {
            app.navigate('lur/1/bing/1', { trigger: true });
            var model = app.lurCollection.get('1');
            var call = app.controllers[0].receivesModelAndModel.getCall(0);

            expect(call.calledWith(model, model)).to.be(true);
          });
        });
      });
    });
  });
});
