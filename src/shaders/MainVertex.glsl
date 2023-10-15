precision mediump float;
attribute vec4 aColor;
attribute vec4 aNormal;
attribute vec4 aPosition;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;


uniform mat3 uNormalMatrix;

varying vec4 vColor;
varying vec3 vNormal;

void main() {
    gl_Position = mProj * mView * mWorld * aPosition;

    vColor = aColor;
    vNormal = uNormalMatrix * vec3(aNormal);
}