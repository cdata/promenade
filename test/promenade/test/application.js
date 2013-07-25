define(['promenade', 'promenade/application'],
       function(Promenade, Application) {

  describe('Promenade.Application', function() {

    var MyApplication;
    var MyController;
    var app;

    beforeEach(function() {
      MyController = Promenade.Controller.extend({
        defineRoutes: function() {
          this.handle('foo', 'foobar');
          this.handle('bar', 'foobar');
        },
        foobar: function() {}
      });
      MyApplication = Application.extend({
        controllers: [
          MyController
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
      expect(Promenade.Application).to.be.ok();
      expect(Application).to.be.ok();
    });

    describe('when a root is specified', function() {

      it('uses it as a selector to set the rootElement', function() {
        expect(app.rootElement).to.be(document.body);
      });

    });

    describe('when routes are declared', function() {

      it('registers a route for each route declared', function() {
        var fooRouteRegExp = app._routeToRegExp('foo');
        var barRouteRegExp = app._routeToRegExp('bar');
        expect(Backbone.history.handlers[0].route).to.be.eql(fooRouteRegExp);
        expect(Backbone.history.handlers[1].route).to.be.eql(barRouteRegExp);
      });

      describe('with named controllers', function() {

        describe('and a navigation event happens', function() {
          beforeEach(function() {
            sinon.spy(app.controllers[0], 'foobar');
          });

          afterEach(function() {
            app.controllers[0].foobar.restore();
            app.navigate('');
          });

          it('calls a named method of the controller when specified',
             function() {
            app.navigate('foo', { trigger: true });
            expect(app.controllers[0].foobar.callCount).to.be(1);
          });
        });
      });
    });
  });
});
