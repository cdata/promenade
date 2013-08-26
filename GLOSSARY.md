# Glossary

This is a placeholder document where various terms in use throughout Promenade
will be defined. Hopefully this will lead us towards consolidating overlapping
concepts and clarifying ambiguous ones.

### sparse

A model is considered sparse if it contains the properties necessary to refer to
a non-populated model (e.g., a type and an id property), and contains no other
properties.

### ready

Readiness is a reflection of completeness of a model or collection. When a model
is created, it is ready if it is not a sparse reference. If a newly created
model is a sparse reference, but does not require syncing, it is considered
ready. Otherwise, when the next change, update or sync event occurs on the
model, readiness is re-assessed based on the same criteria as when it was
created.

### sync, synced

The concept of the sync event carries over from Backbone. Sync events are
triggered whenever a sync operation completes (e.g., when a fetch operation
is resolved successfully). A model or collection is considered synced if sync
has been triggered on them at least once.

### update

When data is propagated to a model or a collection as the result of a sync
operation on that model or collection, or as a side effect from a sync operation
on a related model or collection, update is triggered on the model or collection
that has received the new or updated data. Update is distinct from sync because
it can happen when no sync operation has been performed directly on the model or
collection being updated.

### active, activated

A controller is considered active if the current route matches one of the routes
that the controller has declared the ability to handle. The state of being
active is idempotent, so when the route changes from one handled route to
another that is also handled, the state does not transition.

### inactive, deactivated

A controller is considered inactive if it is not active, which is to say that
the current route does not match any of the routes that the controller has
declared the ability to handle. Inactive-ness is similarly idempotent.

### attach

When a view moves from being parentless to being the child of another view, or
when an element moves from being parentless to being the child of another
element, they are considered to be attached to that other view or element.

### detach

When a view moves from being the child of another view to being parentless, or
when an element moves from being the child of another element to being
parentless, they are considered to be detached from their parent or element
