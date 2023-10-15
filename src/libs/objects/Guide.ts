import { glUtils } from "../utils/glUtils"
import { mat4, vec3 } from "gl-matrix";



const length = 0.125


export class Guide{

    private _opacity : number;
    private _attributes : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
    };


    private _color : vec3;

    

    private _state : {
        position : vec3;
        length : number;
        mvp : mat4;
        n : number;
    }



    constructor(){

        this._opacity = 0.8;
        this._color = [0.2,0.2,0.2];




        var vertices : number[] = [];
        var normals : number[]= [];
        var colors : number[] = [];


        for(let i=0; i <= 40; ++i)
        {
            vertices.push(0, 0, i * length);
            normals.push(0, 0, 0)
            colors.push(this._color[0], this._color[1], this._color[2], this._opacity);
        }
        

        this._attributes = {
            aColor: {
                size:4,
                offset:0,
                bufferData: new Float32Array(colors),
            },
            aNormal: {
                size:3,
                offset:0,
                bufferData: new Float32Array(normals),
            },
            aPosition: {
                size:3,
                offset:0,
                bufferData: new Float32Array(vertices),
            },
        };
    


        this._state = {
            position:[0,0,0],
            length:0,
            mvp: mat4.create(),
            n : 0,
        };

    }




    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {
        
        var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');


        glUtils.renderBuffers(gl, program, this._attributes);
        

        gl.uniformMatrix4fv(matWorldUniformLocation, false, this._state.mvp);

        gl.drawArrays(gl.LINES, 0, this._state.n);
    };


    set position(pos : vec3){
        if(!pos){
            throw new Error("error in Cylinder.ts set start");
        }
        this._state.position[0] = pos[0];
        this._state.position[1] = pos[1];
        this._state.length = pos[2];

        mat4.fromScaling(this._state.mvp , [1,1,Math.sign(this._state.length)]);
        mat4.translate(this._state.mvp , this._state.mvp, this._state.position);

        this._state.n = Math.floor(Math.abs(this._state.length)/length +1.5)
        this._state.n -= this._state.n%2;

    }

    
};
