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
        var clock;

        beforeEach(function() {
          Promenade.View.prototype.defaultSleep = 20;
          clock = sinon.useFakeTimers();

          someView = new MyView();

          for (var i = 0; i < 3; ++i) {
            myView.fooRegion.add(new Promenade.View());
          }

          myView.render();
        });

        afterEach(function() {
          Promenade.View.prototype.defaultSleep = 0;
          clock.restore();
        });

        it('replaces all current views in the region', function() {
          myView.fooRegion.show(someView);

          expect(myView.fooRegion.subviews.length).to.be(1);
          expect(myView.fooRegion.$container.children().length).to.be(1);
          expect(myView.fooRegion.$container.children().get(0)).to.be(someView.el);
        });

        describe('and rendered', function() {
          var grandchildView;

          beforeEach(function() {
            grandchildView = new Promenade.View();
            sinon.spy(grandchildView, 'render');
          });

          it('defers the superview render queue and renders in order', function() {
            var parentCompletionCount = 0;
            var childCompletionCount = 0;
            var grandchildCompletionCount = 0;
            var tick = 0;
            var grandchildCompletionSpy = sinon.spy(function() {
              ++grandchildCompletionCount;
            });

            myView.fooRegion.show(someView);
            someView.fooRegion.show(grandchildView);

            myView.queueCompletes('render').then(function() {
              ++parentCompletionCount;
            });

            someView.queueCompletes('render').then(function() {
              ++childCompletionCount;
            });

            grandchildView.queueCompletes('render').then(grandchildCompletionSpy);

            while (tick < 80) {
              expect(grandchildView.render.callCount).to.be(0);
              expect(parentCompletionCount).to.be(0);
              expect(childCompletionCount).to.be(0);
              expect(grandchildCompletionCount).to.be(0);

              tick = clock.tick(20);
            }

            clock.tick(20);

            expect(parentCompletionCount).to.be(1);
            expect(childCompletionCount).to.be(1);
            expect(grandchildCompletionCount).to.be(1);
            expect(grandchildView.render.callCount).to.be(1);

            expect(grandchildView.render.calledBefore(grandchildCompletionSpy)).to.be(true);
          });
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
