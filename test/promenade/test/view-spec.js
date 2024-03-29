define(['backbone', 'promenade', 'promenade/view'],
       function(Backbone, Promenade, View) {

  describe('Promenade.View', function() {

    var MyView;
    var myModel;

    beforeEach(function() {
      MyView = View.extend({
        template: 'list',
        states: {
          initial: {
            transitionTo: ['foo']
          },
          foo: {
            transitionTo: []
          }
        },
        layout: {
          foo: '.foo',
          bar: '.bar'
        },
        modelEvents: {
          'change:foo': 'onChangeFoo'
        },
        onChangeFoo: function() {}
      });

      myModel = new Backbone.Model({
        foo: 'foo',
        bar: 'bar'
      });
    });

    it('is defined', function() {
      expect(Promenade.View).to.be.ok();
      expect(View).to.be.ok();
    });

    describe('when instantiated', function() {
      var myModel;
      var myView;

      beforeEach(function() {
        myModel = new Promenade.Model({
          id: 1,
          type: 'model',
          foo: 'bar'
        });

        myView = new MyView({
          model: myModel
        });
      });

      it('has a className on its el that reflects the current state', function() {
        expect(myView.$el.hasClass('state-initial')).to.be(true);
      });

      describe('and the state changes', function() {
        it('changes the className on the el', function(){
          myView.transitionTo('foo');
          expect(myView.$el.hasClass('state-foo')).to.be(true);
          expect(myView.$el.hasClass('state-initial')).to.be(false);
        });

        describe('when there are other class names on the el', function () {
          beforeEach(function () {
            //myView.$el.addClass('foo');
            myView.transitionTo('foo');
          });
          it('changes the className on the el', function () {
            expect(myView.$el.hasClass('state-foo')).to.be(true);
            expect(myView.$el.hasClass('state-initial')).to.be(false);
          });
          it('preserves the other non-state class names', function() {
            expect(myView.$el.hasClass('foo'));
          });
        });
      });

      it('adds model data attributes to the root element', function() {
        expect(myView.$el.attr('data-model-id')).to.be('1');
        expect(myView.$el.attr('data-type')).to.be('model');
      });
    });

    describe('when rendered', function() {

      it('has a root element', function() {
        var myView = new MyView().render();

        expect(myView.el).to.be.ok();
      });

      describe('with a declared template', function() {

        it('has a DOM substructure', function() {
          var myView = new MyView().render();

          expect(myView.$el.children().length).to.be(1);
          expect(myView.$el.html()).to.match(/<ul><\/ul>/);
        });

        describe('and in conjunction with a layout', function() {

          it('defines regions based on the layout', function() {
            var myView = new MyView({ model: myModel }).render();

            for (var region in MyView.prototype.layout) {
              expect(myView[myView.getRegionProperty(region)]).to.be.ok();
            }
          });

          describe('with a subview assigned', function() {

            var myView;
            var mySubview;
            var mySubviewRenderSpy;

            beforeEach(function() {
              myView = new MyView({ model: myModel }).render();
              mySubview = new MyView();
              mySubviewRenderSpy = sinon.spy(mySubview, 'render');
            });

            afterEach(function() {
              mySubviewRenderSpy.restore();
            });

            it('does not automatically render the subview', function() {
              myView.fooRegion.show(mySubview);
              expect(mySubviewRenderSpy.called).to.be.eql(false);
            });

            describe('and then re-rendered', function() {

              var subviewDetachSpy;
              var viewHtmlSpy;
              var regionAppendSpy;

              beforeEach(function() {
                subviewDetachSpy = sinon.spy(mySubview.$el, 'detach');
                viewHtmlSpy = sinon.spy(myView.$el, 'html');
                regionAppendSpy = sinon.spy(myView.fooRegion.$container, 'append');
              });

              afterEach(function() {
                subviewDetachSpy.restore();
                viewHtmlSpy.restore();
                regionAppendSpy.restore();
              });

              it('detaches the subview before re-rendering', function() {
                myView.fooRegion.show(mySubview);
                myView.render();

                sinon.assert.callOrder(subviewDetachSpy, viewHtmlSpy);
              });

              it('re-attaches the subview to the appropriate region', function() {
                myView.fooRegion.show(mySubview);
                myView.render();

                expect(mySubview.el.parentNode).to.be.ok();
                expect(mySubview.el.parentNode).to.be(myView.fooRegion.$container.get(0));
              });

              describe('deeply', function() {

                it('calls the subview\'s render', function() {
                  myView.fooRegion.show(mySubview);
                  myView.deepRender();

                  expect(mySubviewRenderSpy.called).to.be.eql(true);
                });
              });
            });
          });
        });
      });
    });

    describe('when there is another view', function() {
      var myView;
      var otherView;

      beforeEach(function() {
        myView = new MyView({ model: myModel }).render();
        otherView = new View();
      });

      afterEach(function() {
        otherView.off();
      });

      describe('and it is attached to the first view', function() {
        it('triggers an attach event', function() {
          var attachEventsTriggered = 0;

          otherView.on('attach', function() {
            attachEventsTriggered++;
          });

          myView.fooRegion.show(otherView);

          expect(attachEventsTriggered).to.be(1);
        });
      });

      describe('and it is detached from the first view', function() {
        it('triggers a detach event', function() {
          var detachEventsTriggered = 0;

          otherView.on('detach', function() {
            detachEventsTriggered++;
          });

          myView.fooRegion.show(otherView);

          otherView.detach();

          expect(detachEventsTriggered).to.be(1);
        });
      });

      describe('while the first view has not yet rendered', function() {
        beforeEach(function() {
          myView = new MyView({ model: myModel });
          document.body.appendChild(myView.el);
        });

        afterEach(function() {
          myView.remove();
        });

        it('does not trigger a dom:attach event', function() {
          var domAttachEventsTriggered = 0;

          expect(myView.fooRegion.$container.length).to.be(0);

          otherView.on('dom:attach', function() {
            ++domAttachEventsTriggered;
          });

          myView.fooRegion.show(otherView);

          expect(domAttachEventsTriggered).to.be(0);
        });

        describe('and the first view is rendered later', function() {
          it('does trigger a dom:attach event', function() {
            var domAttachEventsTriggered = 0;

            otherView.on('dom:attach', function() {
              ++domAttachEventsTriggered;
            });

            myView.fooRegion.show(otherView);

            myView.render();

            expect(myView.fooRegion.$container.length).to.be(1);

            expect(domAttachEventsTriggered).to.be(1);
          });
        });
      });

      describe('and it is attached to an arbitrary chain of parents', function() {
        var someIntermediaryView;

        beforeEach(function() {
          someIntermediaryView = new MyView({ model: myModel }).render();
          myView.fooRegion.show(someIntermediaryView);
          someIntermediaryView.fooRegion.show(otherView);
        });

        afterEach(function() {
          myView.detach();
        });

        describe('and a parent is attached to the DOM', function() {
          it('triggers a dom:attach event', function() {
            var domAttachEventsTriggered = 0;

            otherView.on('dom:attach', function() {
              ++domAttachEventsTriggered;
            });

            myView.attachTo($(document.body));

            expect(domAttachEventsTriggered).to.be(1);
          });
        });

        describe('and a parent is detached from the DOM', function() {
          it('triggers a dom:detach event', function() {
            var domDetachEventsTriggered = 0;

            otherView.on('dom:detach', function() {
              domDetachEventsTriggered++;
            });

            myView.attachTo(document.body);
            myView.detach();

            expect(domDetachEventsTriggered).to.be(1);
          });
        });
      });
    });

    describe('when dealing with an assigned model', function() {

      describe('calls to serializeModelData', function() {

        var myView;

        beforeEach(function() {
          myView = new MyView({ model: myModel });
        });

        it('properly serialize the model as a plain object', function() {
          var data = myView.serializeModelData();

          expect(data).to.be.eql({ foo: 'foo', bar: 'bar', model_is_new: true });
        });

        it('will always return an object', function() {
          var data;

          myView.model = null;

          data = myView.serializeModelData();

          expect(data).to.be.eql({});
        });
      });

      describe('when modelEvents are declared', function() {

        describe('and the model attributes change', function() {
          it('re-renders the view', function() {
            var model = new Promenade.Model();
            var ViewClass = View.extend();
            var viewInstance = new ViewClass({ model: model });

            sinon.spy(viewInstance, 'render');

            //model.set({ foo: 'foo' });
            model.set('foo', 'bar');

            expect(viewInstance.render.callCount).to.be(1);
          });

          describe('with renderOnChange set to false', function() {

            it('does not re-render the view', function() {
              var model = new Promenade.Model();
              var ViewClass = View.extend({
                renderOnChange: false
              });

              var viewInstance = new ViewClass({ model: model });

              sinon.spy(viewInstance, 'render');

              model.set('foo', 'bar');

              expect(viewInstance.render.callCount).to.be(0);
            });
          });
        });

        it('calls a method on the view appropriately', function() {
          var myView;

          sinon.spy(MyView.prototype, 'onChangeFoo');

          myView = new MyView({ model: myModel });

          myModel.set('foo', 'baz');

          expect(myView.onChangeFoo.calledOnce).to.be.eql(true);

          MyView.prototype.onChangeFoo.restore();
        });
      });
    });
  });
});
