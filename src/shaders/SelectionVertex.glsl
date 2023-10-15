attribute vec4 aPosition;
attribute vec4 aColor;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;


varying vec4 vColor;

void main() {
    gl_Position = mProj * mView * mWorld * aPosition;
    vColor = aColor;
}