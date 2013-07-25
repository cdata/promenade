define(['backbone', 'promenade', 'promenade/view'],
       function(Backbone, Promenade, View) {

  describe('Promenade.View', function() {

    var MyView;
    var myModel;

    beforeEach(function() {
      MyView = View.extend({
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

      myModel = new Backbone.Model({
        foo: 'foo',
        bar: 'bar'
      });
    });

    it('is defined', function() {
      expect(Promenade.View).to.be.ok();
      expect(View).to.be.ok();
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

    describe('when dealing with an assigned model', function() {

      describe('calls to serializeModelData', function() {

        var myView;

        beforeEach(function() {
          myView = new MyView({ model: myModel });
        });

        it('properly serialize the model as a plain object', function() {
          var data = myView.serializeModelData();

          expect(data).to.be.eql({ foo: 'foo', bar: 'bar' });
        });

        it('will fallback to a defined collection', function() {
          var data;

          myView.model = null;
          myView.collection = new Backbone.Collection([{}, {}, {}]);

          data = myView.serializeModelData();

          expect(data).to.be.eql([{}, {}, {}]);
        });

        it('will always return an object', function() {
          var data;

          myView.model = null;

          data = myView.serializeModelData();

          expect(data).to.be.eql({});
        });
      });

      describe('when modelEvents are declared', function() {

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
