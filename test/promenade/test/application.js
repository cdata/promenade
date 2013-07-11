define(['promenade', 'promenade/application'],
       function(Promenade, Application) {

  describe('Promenade.Application', function() {

    var MyApplication;
    var MyController;
    var app;

    beforeEach(function() {
      MyController = Promenade.Controller.extend({
        'foobar': function() {}
      });
      MyApplication = Application.extend({
        root: 'body',
        routes: {
          'bar': 'main',
          'foo': 'main#foobar'
        },
        controllers: {
          'main': new MyController()
        }
      });
      app = new MyApplication();
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

      describe('and a layout is set', function() {

        it('renders and appends the layout to the rootElement', function() {
          var myLayout = new Promenade.View();
          app.setLayoutView(myLayout);

          expect(myLayout.rendered).to.be(true);
          expect(myLayout.el.parentNode).to.be(app.rootElement);
        });
      });
    });

    describe('when routes are declared', function() {

      it('registers a route for each route declared', function() {
        var routeRegExp = app._routeToRegExp('foo');
        expect(Backbone.history.handlers[0].route).to.be.eql(routeRegExp);
      });

      describe('with named controllers', function() {

        describe('and a navigation event happens', function() {
          beforeEach(function() {
            sinon.spy(app.controllers.main, 'index');
            sinon.spy(app.controllers.main, 'foobar');
          });

          afterEach(function() {
            app.controllers.main.index.restore();
            app.controllers.main.foobar.restore();
            app.navigate('');
          });

          it('calls the index method of the controller by default',
             function() {
            app.navigate('bar', { trigger: true });
            expect(app.controllers.main.index.callCount).to.be(1);
          });

          it('calls a named method of the controller when specified',
             function() {
            app.navigate('foo', { trigger: true });
            expect(app.controllers.main.foobar.callCount).to.be(1);
          });
        });
      });
    });
  });
});
