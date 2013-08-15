define(['backbone', 'promenade', 'promenade/collection/retainer'],
       function(Backbone, Promenade, RetainerApi) {

  describe('Promenade.Collection.Retainer', function() {

    it('is defined', function() {
      expect(Promenade.Collection.Retainer).to.be.ok();
      expect(RetainerApi).to.be.ok();
    });
  });
});

