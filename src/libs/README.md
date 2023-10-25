# Object

Object folder contains object classes. The Arrow class is for the arrows on the vertices when drawing the knot, and the Guide class is the dotted line when drawing the knot. The Circle, Sphere, and Cylinder have static BufferObject instances, so that when new Circle, Sphere, or Cylinder is created, if they have different color and size to all the previously created object, a new object is created. Otherwise, if an object with the same size and color already exists in memory, only a reference to it will be created. A _draw_ function is implemented in each object.


# Utils

Utilities for WebGL.


