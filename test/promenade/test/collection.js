define(['backbone', 'promenade', 'promenade/collection'],
       function(Backbone, Promenade, Collection) {
  describe('Promenade.Collection', function() {
    it('is defined', function() {
      expect(Promenade.Collection).to.be.ok();
      expect(Collection).to.be.ok();
    });
  });
});
