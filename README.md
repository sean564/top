# top
Project

This website takes either pre-drawn or user-drawn knots, and finds 'satanic circles':
We take either 2000 or 800 points (call this point "red point"), equally distanced on the knot, and calculate circles that intersect the knot in four other points including the red points on the knot, such that adjacent points on the circle are not adjacent on the knot. The number of circles at each red point represents the second order coefficient of the Conway-Alexander polynomial in mod 2.

The calculations uses Ptolemy's equation, which is a non-negative function that takes four points in $R^3$, and returns 0 if and only if the four points lie on a common circle. Since, in our case, we need to chech that five points are concyclic, we could take the sum of two Ptolemy equation, each Ptolemy's equation evaluated at different set of points.
We subdivide the knot into 22 segments, take four points from each distinct segment, and run Newton's method on the gradient of the sum of two Ptolemy equation, taking initial points as those chosen from the distinct segments. The red point remains invariant during the Newton's method, so that it finds four points that are concyclic with the red point. 

Calculation of the Newton's method is performed in the user's GPU using WebGPU API. The script is in the file src/shaders/firstComput.wgsl. 

The animations of the website are done using WebGL, so that it supports more browsers.
