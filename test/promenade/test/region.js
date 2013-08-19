define(['promenade', 'promenade/region'],
       function(Promenade, Region) {

  describe('Promenade.Region', function() {

    var MyView;
    var myView;

    beforeEach(function() {
      MyView = Promenade.View.extend({
        template: 'list',
        layout: {
          foo: '.foo',
          bar: '.bar'
        },
        modelEvents: {
          'change:foo': 'onChangeFoo'
        },
        onChangeFoo: function() {}
      });
      myView = new MyView({
        model: new Promenade.Model({
          foo: 'foo',
          bar: 'bar'
        })
      });
    });

    it('is defined', function() {
      expect(Promenade.Region).to.be.ok();
      expect(Region).to.be.ok();
    });

    describe('when declared as part of a view\'s layout', function() {

      it('is created as a property on that view', function() {
        expect(myView.fooRegion).to.be.ok();
        expect(myView.barRegion).to.be.ok();
      });

      it('has an appropriate selector property', function() {
        expect(myView.fooRegion.selector).to.be.eql('.foo');
      });

      describe('before render', function() {

        it('does not have a $container element', function() {
          expect(myView.fooRegion.$container.length).to.be.eql(0);
        });

      });

      describe('when a view is added', function() {
        var someView;

        beforeEach(function() {
          someView = new Backbone.View();
          for (var i = 0; i < 3; ++i) {
            myView.fooRegion.add(new Backbone.View());
          }
          myView.render();
        });

        it('is appended to the $container element', function() {
          var subviewCount = myView.fooRegion.subviews.length;

          myView.fooRegion.add(someView);

          expect(myView.fooRegion.subviews.length).to.be(subviewCount + 1);
          expect(myView.fooRegion.$container.children().last().get(0)).to.be(someView.el);
        });
      });

      describe('when a view is removed', function() {
        var someView;

        beforeEach(function() {
          someView = new Backbone.View();

          for (var i = 0; i < 3; ++i) {
            myView.fooRegion.add(new Backbone.View());
          }

          myView.fooRegion.add(someView);

          myView.render();
        });

        it('is removed from the $container element', function() {
          var subviewCount = myView.fooRegion.subviews.length;

          expect(someView.$el.parent().get(0)).to.be(myView.fooRegion.$container.get(0));

          myView.fooRegion.remove(someView);

          expect(myView.fooRegion.subviews.length).to.be(subviewCount - 1);
          expect(someView.$el.parent().get(0)).to.not.be.ok();
        });
      });

      describe('when a view is inserted', function() {
        var someView;

        beforeEach(function() {
          someView = new Backbone.View();

          for (var i = 0; i < 3; ++i) {
            myView.fooRegion.add(new Backbone.View());
          }

          myView.render();
        });

        it('is added at the provided index', function() {
          var subviewCount = myView.fooRegion.subviews.length;

          myView.fooRegion.insertAt(someView, 2);

          expect(myView.fooRegion.subviews.length).to.be(subviewCount + 1);
          expect(someView.$el.siblings().get(1)).to.be(
              myView.fooRegion.$container.children().get(1));
          expect(someView.$el.siblings().get(2)).to.be(
              myView.fooRegion.$container.children().get(3));
        });
      });

      describe('when a view is shown', function() {
        var someView;

        beforeEach(function() {
          someView = new Backbone.View();

          for (var i = 0; i < 3; ++i) {
            myView.fooRegion.add(new Backbone.View());
          }

          myView.render();
        });

        it('replaces all current views in the region', function() {
          myView.fooRegion.show(someView);

          expect(myView.fooRegion.subviews.length).to.be(1);
          expect(myView.fooRegion.$container.children().length).to.be(1);
          expect(myView.fooRegion.$container.children().get(0)).to.be(someView.el);
        });
      });

      describe('after render', function() {
        beforeEach(function() {
          myView.render();
        });

        it('has a $container element', function() {
          expect(myView.fooRegion.$container).to.be.ok();
          expect(myView.fooRegion.$container.length).to.be.eql(1);
        });
      });
    });
  });
});
