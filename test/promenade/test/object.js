define(['promenade', 'promenade/object'],
       function(Promenade, PromenadeObject) {

  describe('Promenade.Object', function() {
    it('is defined', function() {
      expect(Promenade.Object).to.be.ok();
      expect(PromenadeObject).to.be.ok();
    });

    it('supports the Backbone.Events API', function() {
      expect(PromenadeObject.prototype.on).to.be.ok();
      expect(PromenadeObject.prototype.off).to.be.ok();
      expect(PromenadeObject.prototype.listenTo).to.be.ok();
      expect(PromenadeObject.prototype.stopListening).to.be.ok();
    });

    it('supports Backbone\'s \'extend\' inheritance pattern', function() {
      expect(PromenadeObject.extend).to.be.ok();
    });
  });
});
