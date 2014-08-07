define(['backbone', 'promenade', 'promenade/controller/action'],
       function (Backbone, Promenade, ControllerAction) {
  'use strict';

  describe('Promenade.ControllerAction', function () {
    it('is defined', function () {
      expect(Promenade.ControllerAction).to.be.ok();
      expect(ControllerAction).to.be.ok();
    });

    describe('when created without a parent context', function () {
      var controllerActionWithoutParent;
      var controller;
      var theController;

      beforeEach(function () {
        controller = {
          app: {
            getResource: function () {}
          },
          isActive: function() {
            return true;
          },
          setActive: function () {},
          trigger: function () {},
          fooRoute: function () {},
          fooBarRoute: function () {},
          quxRoute: function () {},
          getFragment: sinon.stub()
        };

        controller.getFragment.returns('');

        theController = sinon.mock(controller);

        controllerActionWithoutParent = new ControllerAction({
          controller: controller
        });
      });

      it('has an empty pathname', function () {
        expect(controllerActionWithoutParent.getPathname()).to.be('');
      });

      it('has an empty fragment', function () {
        expect(controllerActionWithoutParent.getFragment()).to.be('');
      });

      it('has an empty parameter', function () {
        expect(controllerActionWithoutParent.getParameter()).to.be('');
      });

      describe('and fork is called', function () {
        var newControllerAction;

        beforeEach(function () {
          newControllerAction = controllerActionWithoutParent.fork();
        });

        it('returns a new ControllerAction', function () {
          expect(newControllerAction).to.be.a(ControllerAction);
        });

        it('sets the forked ControllerAction as the parent of the new action', function() {
          expect(newControllerAction.getParentAction()).to.be(controllerActionWithoutParent);
        });
      });

      describe('and then the mediator interface is requested', function () {
        var mediatorInterface;

        beforeEach(function () {
          mediatorInterface = controllerActionWithoutParent.getMediator();
        });

        it('allows you to retrieve the related action', function () {
          expect(mediatorInterface.getRelatedAction()).to.be(controllerActionWithoutParent);
        });

        describe('and a show action is defined', function () {
          var relatedAction;

          beforeEach(function () {
            mediatorInterface.show('foo', function () {
              relatedAction = this.getRelatedAction();
            });
          });

          it('creates a related action', function () {
            expect(relatedAction).to.be.a(ControllerAction);
            expect(relatedAction.getParentAction()).to.be(controllerActionWithoutParent);
          });

          describe('the related action', function () {
            it('has a set type', function () {
              expect(relatedAction.getType()).to.be('foo');
            });

            it('has a parameter', function () {
              expect(relatedAction.getParameter()).to.be.ok();
            });

            it('has a corresponding fragment', function () {
              expect(relatedAction.getFragment()).to.be('foo');
            });

            it('will yield the correct Backbone route string', function () {
              expect(relatedAction.getRoute()).to.be('foo/:foo');
            });
          });
        });

        describe('when a nested action is defined through a mediator', function () {
          var firstRelatedAction;
          var nestedRelatedAction;

          beforeEach(function () {
            mediatorInterface.show('foo', function () {
              firstRelatedAction = this.getRelatedAction();

              this.show('bar', function () {
                nestedRelatedAction = this.getRelatedAction();
              });
            });
          });

          it('creates a parent-child relationship between two actions', function () {
            expect(nestedRelatedAction.getParentAction()).to.be(firstRelatedAction);
          });

          describe('the child action', function () {
            it('has a pathname that is based on the parent action\'s pathname', function () {
              expect(firstRelatedAction.getPathname()).to.be('foo/:foo');
              expect(nestedRelatedAction.getPathname()).to.be('foo/:foo/bar/:bar');
            });

            it('has a route that is based on it\'s own pathname', function () {
              expect(nestedRelatedAction.getRoute()).to.be('foo/:foo/bar/:bar');
            });
          });
        });

        describe('when there is a complex action hierarchy defined', function () {
          var firstChildAction;
          var lastChildAction;

          beforeEach(function () {
            mediatorInterface.handle('base', function () {
              firstChildAction = this.getRelatedAction();

              this.show('foo', function () {
                this.index('bar');
              });

              this.show('bar', function () {
                this.handle('qux', function () {
                  this.show('vim');
                });
              });

              this.index('vim', function () {
                lastChildAction = this.getRelatedAction();
              });
            });
          });

          it('can be flattened', function () {
            var flattened = controllerActionWithoutParent.flatten();

            expect(flattened[0]).to.be(controllerActionWithoutParent);
            expect(flattened[1]).to.be(firstChildAction);
            expect(flattened[flattened.length - 1]).to.be(lastChildAction);
          });
        });

        describe('when an Action supports a Controller', function () {
          var callHandler = function (handler, args, done) {
            handler.apply(null, args).then(function () {
              theController.verify();
              done();
            }).catch(function (e) {
              done(e);
            });
          };
          var fooAction;
          var fooBarAction;
          var quxAction;

          beforeEach(function () {
            mediatorInterface.query('foo');

            mediatorInterface.show('foo', 'fooRoute', function () {
              fooAction = this.getRelatedAction();
              this.show('bar', 'fooBarRoute', function () {
                fooBarAction = this.getRelatedAction();
              });

              this.handle('qux', 'quxRoute', function () {
                quxAction = this.getRelatedAction();
              });
            });
          });

          it('can create route handlers for defined routes', function (done) {
            var handler;

            theController.expects('fooRoute').once().withArgs(1, {});

            handler = fooAction.createRouteHandlerForController(controller);

            callHandler(handler, [1, undefined], done);
          });

          it('handles compound actions correctly', function (done) {
            var handler;

            theController.expects('fooBarRoute').once().withArgs(1, 2, {});

            handler = fooBarAction.createRouteHandlerForController(controller);

            callHandler(handler, [1, 2, undefined], done);
          });

          describe('a handle action', function () {
            it('does not generate a parameter for the controller handler', function (done) {
              var handler;

              theController.expects('quxRoute').once().withExactArgs(1, {});

              handler = quxAction.createRouteHandlerForController(controller);

              callHandler(handler, [1, undefined], done);
            });
          });

          describe('and a query parameter is allowed', function () {
            beforeEach(function () {
              sinon.spy(controller, 'fooRoute');
            });

            afterEach(function () {
              controller.fooRoute.restore();
            });

            it('passes a provided optional query parameter through to the handler', function (done) {
              var handler = fooAction.createRouteHandlerForController(controller);

              controller.getFragment.returns('foo/1?foo=1');

              handler(1, 'foo=1').then(function () {
                var args = controller.fooRoute.firstCall.args;

                expect(controller.fooRoute.calledOnce).to.be(true);
                expect(args[0]).to.be(1);
                expect(args[1]).to.be.eql({ foo: '1' });

                done();
              }).catch(function (e) {
                done(e);
              });
            });

            it('does not pass unrecognized query parameters through to the handler', function (done) {
              var handler = fooAction.createRouteHandlerForController(controller);

              controller.getFragment.returns('foo/1?foo=1&bar=2');

              handler(1, 'foo=1&bar=2').then(function () {
                var args = controller.fooRoute.firstCall.args;

                expect(controller.fooRoute.calledOnce).to.be(true);
                expect(args[0]).to.be(1);
                expect(args[1]).to.be.eql({ foo: '1' });

                done();
              }).catch(function (e) {
                done(e);
              });
            });
          });
        });
      });
    });
  });
});
