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

      it('is marked as rendered', function() {
        var myView = new MyView().render();

        expect(myView.rendered).to.be.eql(true);
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

            for (var region in View.prototype.layout) {
              expect(view.regions[region]).to.be.ok();
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

            it('renders the subview', function() {
              myView.setSubview(mySubview);
              expect(mySubviewRenderSpy.calledOnce).to.be.eql(true);
            });

            it('appends the subview to the root element by default', function() {
              myView.setSubview(mySubview);
              expect(mySubview.el.parentNode).to.be.eql(myView.el);
            });

            it('appends the subview to a region if specified', function() {
              myView.setSubview('foo', mySubview);
              expect(mySubview.el.parentNode).to.be.eql(myView.regions.foo);
            });

            describe('and then re-rendered', function() {

              var subviewDetachSpy;
              var viewHtmlSpy;
              var viewAppendSpy;

              beforeEach(function() {
                subviewDetachSpy = sinon.spy(mySubview.$el, 'detach');
                viewHtmlSpy = sinon.spy(myView.$el, 'html');
                viewAppendSpy = sinon.spy(myView.$el, 'append');
              });

              afterEach(function() {
                subviewDetachSpy.restore();
                viewHtmlSpy.restore();
                viewAppendSpy.restore();
              });

              it('detaches the subview before re-rendering', function() {
                myView.setSubview(mySubview);
                myView.render();

                sinon.assert.callOrder(subviewDetachSpy, viewHtmlSpy);
              });

              it('re-attaches the subview', function() {
                myView.setSubview(mySubview);
                myView.render();

                expect(viewAppendSpy.calledTwice).to.be.eql(true);
                expect(viewAppendSpy.args[1][0]).to.be.eql(mySubview.$el);
                sinon.assert.callOrder(viewHtmlSpy, viewAppendSpy);
              });

              it('re-attaches the subview to the appropriate region', function() {
                myView.setSubview('foo', mySubview);
                myView.render();

                expect(viewAppendSpy.called).to.be.eql(false);
                expect(mySubview.el.parentNode).to.be(myView.regions.foo);
              });

              describe('deeply', function() {

                it('calls the subview\'s render', function() {
                  myView.setSubview(mySubview);
                  myView.deepRender();

                  expect(mySubviewRenderSpy.calledTwice).to.be.eql(true);
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
