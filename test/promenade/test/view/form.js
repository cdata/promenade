define(['promenade', 'promenade/view/form'],
       function(Promenade, FormView) {

  describe('Promenade.FormView', function() {

    it('is defined', function() {
      expect(Promenade.FormView).to.be.ok();
      expect(FormView).to.be.ok();
    });

    describe('when instantiated', function() {

      var MyFormView;
      var myFormView;

      beforeEach(function() {
        MyFormView = Promenade.FormView.extend({
          template: 'form'
        });
        myFormView = new MyFormView();
        myFormView.render();
      });

      describe('when submitted', function(){

        var viewSubmitHandler;
        var domSubmitHandler;

        beforeEach(function(){
          viewSubmitHandler = sinon.spy();
          myFormView.on('submit', viewSubmitHandler);
        });

        describe('when submitted by clicking submit', function(){

          beforeEach(function(){
            myFormView.$('form').submit();
          });

          it('triggers a submit event', function(){
            sinon.assert.calledOnce(viewSubmitHandler);
          });
        });

        describe('when submitted by triggering a dom submit event', function(){

          beforeEach(function(){
            myFormView.$('input[type=submit]').click();
          });

          it('triggers a submit event', function(){
            sinon.assert.calledOnce(viewSubmitHandler);
          });
        });
      });

      describe('#reset', function(){

        beforeEach(function(){
          myFormView.$('[type=text]').val('Foo');
          myFormView.$('[type=checkbox]').prop('checked', true);

          myFormView.reset();
        });

        it('resets the values of input fields', function(){
          expect(myFormView.$('[type=text]').val()).to.be('');
        });

        it('sets checkboxes to false', function(){
          expect(myFormView.$('[type=checkbox]').prop('checked')).to.be(false);
        });
      });
    });
  });
});
