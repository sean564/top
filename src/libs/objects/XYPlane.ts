

import { glUtils } from "../utils/glUtils"
import { mat4, mat3 } from "gl-matrix";

export class XYPlane {
    // private id : string;
    private _opacity1 : number;
    private _opacity2 : number;
    private _attributes1 : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
        
    };

    private _attributes2 : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
        
    };
    private _indices1 : Uint8Array;

    private _buffers1! : { [name: string]: WebGLBuffer};
    private _indexBuffer1! : WebGLBuffer | null;

    private _buffers2! : { [name: string]: WebGLBuffer};

    private _state : {
        mvp : mat4;
        nm : mat3;
        n1 : number;
        n2 : number;
    }


    // Initialization
    constructor(){
        this._opacity1 = 0.24;
        this._opacity2 = 0.40;
        this._attributes1 =  {
            aColor: {
                size:4,
                offset:0,
                bufferData: new Float32Array([
                    0, 0, 0, this._opacity1,
                    0, 0, 0, this._opacity1,
                    0, 0, 0, this._opacity1,
                    0, 0, 0, this._opacity1,
                ]),
            },
            aNormal: {
                size:3,
                offset:0,
                bufferData: new Float32Array([
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                ]),
            },
            aPosition: {
                size:3,
                offset:0,
                bufferData: new Float32Array([       
                    5, 5, 0.0,
                    5, -5, 0.0,
                    -5, 5, 0.0,
                    -5, -5, 0.0,
                ]),
            },
        };
        this._indices1 = new Uint8Array([
            0,1,2, 1,2,3,
        ]);

        this._attributes2 =  {
            aColor: {
                size:4,
                offset:0,
                bufferData: new Float32Array([
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,

                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,

                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,

                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                    0, 0, 0, this._opacity2,
                ]),
            },
            aNormal: {
                size:3,
                offset:0,
                bufferData: new Float32Array([
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,

                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,

                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,

                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                ]),
            },
            aPosition: {
                size:3,
                offset:0,
                bufferData: new Float32Array([       
                    5.0, 0.0, 0.0,
                    -5.0, 0.0, 0.0,
                    5.0, 0.5, 0.0,
                    -5.0, 0.5, 0.0,
                    5.0, 1.0, 0.0,
                    -5.0, 1.0, 0.0,
                    5.0, 1.5, 0.0,
                    -5.0, 1.5, 0.0,
                    5.0, 2.0, 0.0,
                    -5.0, 2.0, 0.0,
                    5.0, 2.5, 0.0,
                    -5.0, 2.5, 0.0,
                    5.0, 3.0, 0.0,
                    -5.0, 3.0, 0.0,
                    5.0, 3.5, 0.0,
                    -5.0, 3.5, 0.0,
                    5.0, 4.0, 0.0,
                    -5.0, 4.0, 0.0,
                    5.0, 4.5, 0.0,
                    -5.0, 4.5, 0.0,

                    5.0, -0.5, 0.0,
                    -5.0, -0.5, 0.0,
                    5.0, -1.0, 0.0,
                    -5.0, -1.0, 0.0,
                    5.0, -1.5, 0.0,
                    -5.0, -1.5, 0.0,
                    5.0, -2.0, 0.0,
                    -5.0, -2.0, 0.0,
                    5.0, -2.5, 0.0,
                    -5.0, -2.5, 0.0,
                    5.0, -3.0, 0.0,
                    -5.0, -3.0, 0.0,
                    5.0, -3.5, 0.0,
                    -5.0, -3.5, 0.0,
                    5.0, -4.0, 0.0,
                    -5.0, -4.0, 0.0,
                    5.0, -4.5, 0.0,
                    -5.0, -4.5, 0.0,

                    0.0, 5.0, 0.0,
                    0.0, -5.0, 0.0,
                    0.5, 5.0, 0.0,
                    0.5, -5.0, 0.0,
                    1.0, 5.0, 0.0,
                    1.0, -5.0, 0.0,
                    1.5, 5.0, 0.0,
                    1.5, -5.0, 0.0,
                    2.0, 5.0, 0.0,
                    2.0, -5.0, 0.0,
                    2.5, 5.0, 0.0,
                    2.5, -5.0, 0.0,
                    3.0, 5.0, 0.0,
                    3.0, -5.0, 0.0,
                    3.5, 5.0, 0.0,
                    3.5, -5.0, 0.0,
                    4.0, 5.0, 0.0,
                    4.0, -5.0, 0.0,
                    4.5, 5.0, 0.0,
                    4.5, -5.0, 0.0,
                    
                    -0.5, 5.0, 0.0,
                    -0.5, -5.0, 0.0,
                    -1.0, 5.0, 0.0,
                    -1.0, -5.0, 0.0,
                    -1.5, 5.0, 0.0,
                    -1.5, -5.0, 0.0,
                    -2.0, 5.0, 0.0,
                    -2.0, -5.0, 0.0,
                    -2.5, 5.0, 0.0,
                    -2.5, -5.0, 0.0,
                    -3.0, 5.0, 0.0,
                    -3.0, -5.0, 0.0,
                    -3.5, 5.0, 0.0,
                    -3.5, -5.0, 0.0,
                    -4.0, 5.0, 0.0,
                    -4.0, -5.0, 0.0,
                    -4.5, 5.0, 0.0,
                    -4.5, -5.0, 0.0,
                ]),
            },

        };

        this._state = {
            mvp : mat4.create(),
            nm: mat3.create(),
            n1 : this._indices1.length,
            n2 : 76,
        };

        mat4.identity(this._state.mvp);
        this._state.nm = mat3.normalFromMat4(mat3.create(), this._state.mvp);
    }
    
    
    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {

        if(!this._buffers1){
            [this._buffers1, this._indexBuffer1] = glUtils.initBuffers(gl, program, this._attributes1, this._indices1);
            [this._buffers2,] = glUtils.initBuffers(gl, program, this._attributes2);
        }

        var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');

        var uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix'); 


        gl.uniformMatrix4fv(matWorldUniformLocation, false, this._state.mvp);
        gl.uniformMatrix3fv(uNormalMatrix, false, this._state.nm);


        glUtils.bindBuffers(gl, program, this._attributes1, this._buffers1, this._indexBuffer1);
        gl.drawElements(gl.TRIANGLES, this._state.n1, gl.UNSIGNED_BYTE, 0);

        glUtils.bindBuffers(gl, program, this._attributes2, this._buffers2);
        gl.drawArrays(gl.LINES, 0, this._state.n2);
    };

    
};

