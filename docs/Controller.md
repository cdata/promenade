# Controller

Promenade.Controller is a contruct that is used to handle responses to navigation events in the application.

## Route handling

When routes are declared in a Promenade application, they are associated with a controller instance. Unless otherwise specified, a route will attempt to call the `index` method of the controller. However, other methods may be specified in a freeform fashion.
