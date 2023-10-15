

import { glUtils } from "../utils/glUtils"
import { mat4, mat3, vec3, quat } from "gl-matrix";

export class VerticalArrows {
    private _arrows : Arrow[];
    private _position : vec3;

    constructor(){
        this._arrows = [new Arrow([0,0,1]), new Arrow([0,0,-1])];
        this._position = [0,0,0];
    }

    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {

        this._arrows[0].draw(gl, program);
        this._arrows[1].draw(gl, program);
    }

    set position(pos: vec3){
        if(!pos){
            throw new Error("error in Arrow.ts set position");
        }
        this._arrows[0].position = pos;
        this._arrows[1].position = pos;

    }
    
}


export class PlanarArrows {
    private _arrows : Arrow[];
    private _position : vec3;
    
    constructor(){
        this._arrows = [new Arrow([1,0,0]), new Arrow([-1,0,0]), new Arrow([0,1,0]), new Arrow([0,-1,0])];
        this._position = [0,0,0];
    }

    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {

        this._arrows[0].draw(gl, program);
        this._arrows[1].draw(gl, program);
        this._arrows[2].draw(gl, program);
        this._arrows[3].draw(gl, program);
    };

    set position(pos: vec3){
        if(!pos){
            throw new Error("error in Arrow.ts set position");
        }
        this._arrows[0].position = pos;
        this._arrows[1].position = pos;
        this._arrows[2].position = pos;
        this._arrows[3].position = pos;
    }
    

}

export class Arrow {
    // private id : string;

    private _attributes : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
    };
    private _indices : Uint8Array;
    private _state : {
        mvp : mat4;
        nm : mat3;
        n : number;
    }


    // Initialization
    constructor(
        normal : vec3 = [0,0,0],
    ){

    this._state = {
        mvp: mat4.create(),
        nm: mat3.create(),
        n : 0,
    };

    const color: vec3 = [0.3, 0.3, 0.3];
    const opacity: number = 0.3;



    const sectorCount = 16;

    const offset = 0.2;
    const shaftLen = 0.2;
    const shaftRad = 0.04;
    const coneLen = 0.2;
    const coneRad = 0.08;

    let sectorAngle = 0;


    var vertices : number[] = [];
    var normals : number[]= [];
    var colors : number[] = [];
    var indices : number[] = [];

    const normQuat = quat.rotationTo(
        quat.create(),
        [0,0,1],
        normal
    );

    var temp : vec3 = vec3.create();
    var z : number;
    var x : number;
    var y : number;

    for(let i=0; i <= 1; ++i)
    {
        z = i*shaftLen + offset;

        for(let j=0, k=0; j <= sectorCount; ++j, k+=3)
        {
            sectorAngle = j/sectorCount * 2 * Math.PI;

            x = Math.cos(sectorAngle);
            y = Math.sin(sectorAngle)

            vec3.transformQuat(temp, [shaftRad * x, shaftRad * y, z], normQuat);

            vertices.push(temp[0], temp[1], temp[2]);

            vec3.transformQuat(temp, [x, y, 0], normQuat);

            normals.push(temp[0], temp[1], temp[2]);

            colors.push(color[0], color[1], color[2], opacity);

        }
    }
    

    var k1 : number;
    var k2 : number;

    for(let i=0; i < 1; ++i)
    {
        k1 = i * (sectorCount + 1);     // bebinning of current stack
        k2 = k1 + sectorCount + 1;      // beginning of next stack

        for(let j=0; j < sectorCount; ++j, ++k1, ++k2)
        {
            // 2 trianles per sector
            indices.push(k1, k1 + 1, k2);
            indices.push(k2, k1 + 1, k2 + 1);

        }
    }

    for(let i=0; i <= 1; ++i)
    {
        z = offset + shaftLen;

        for(let j=0, k=0; j <= sectorCount; ++j, k+=3)
        {
            sectorAngle = j/sectorCount * 2 * Math.PI;

            x = Math.cos(sectorAngle);
            y = Math.sin(sectorAngle)

            if(i == 0){
                vec3.transformQuat(temp, [shaftRad * x, shaftRad * y, z], normQuat);
            }else{
                vec3.transformQuat(temp, [coneRad * x, coneRad * y, z], normQuat);
            }


            vertices.push(temp[0], temp[1], temp[2]);

            vec3.transformQuat(temp, [0, 0, -1], normQuat);

            normals.push(temp[0], temp[1], temp[2]);

            colors.push(color[0], color[1], color[2], opacity);

        }
    }

    for(let i=2; i < 3; ++i)
    {
        k1 = i * (sectorCount + 1);     // bebinning of current stack
        k2 = k1 + sectorCount + 1;      // beginning of next stack

        for(let j=0; j < sectorCount; ++j, ++k1, ++k2)
        {
            // 2 trianles per sector
            indices.push(k1, k1 + 1, k2);
            indices.push(k2, k1 + 1, k2 + 1);

        }
    }
    



    for(let i=0; i <= 1; ++i)
    {
        z = i*coneLen + offset + shaftLen;

        for(let j=0, k=0; j <= sectorCount; ++j, k+=3)
        {
            sectorAngle = j/sectorCount * 2 * Math.PI;

            x = Math.cos(sectorAngle);
            y = Math.sin(sectorAngle)

            if(i == 0){
                vec3.transformQuat(temp, [coneRad * x, coneRad * y, z], normQuat);
            }else{
                vec3.transformQuat(temp, [0, 0, z], normQuat);
            }

            vertices.push(temp[0], temp[1], temp[2]);

            vec3.transformQuat(temp, [x * coneLen, y * coneLen, coneRad], normQuat);
            vec3.normalize(temp, temp);

            normals.push(temp[0], temp[1], temp[2]);

            colors.push(color[0], color[1], color[2], opacity);

        }
    }

    for(let i=4; i < 5; ++i)
    {
        k1 = i * (sectorCount + 1);     // bebinning of current stack
        k2 = k1 + sectorCount + 1;      // beginning of next stack

        for(let j=0; j < sectorCount; ++j, ++k1, ++k2)
        {
            // 2 trianles per sector
            indices.push(k1, k1 + 1, k2);
            indices.push(k2, k1 + 1, k2 + 1);

        }
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

    this._indices = new Uint8Array(indices);



    this._state.n = this._indices.length;
    mat4.identity(this._state.mvp);
    mat3.normalFromMat4(this._state.nm, this._state.mvp);

}
    
    
    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {


        var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
        var uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix'); 

        glUtils.renderBuffers(gl, program, this._attributes, this._indices);

        gl.uniformMatrix4fv(matWorldUniformLocation, false, this._state.mvp);

        
        gl.uniformMatrix3fv(uNormalMatrix, false, this._state.nm);
    
        gl.drawElements(gl.TRIANGLES, this._state.n, gl.UNSIGNED_BYTE, 0);
    };

    set position(pos : vec3){
        mat4.fromTranslation(this._state.mvp, pos);
        mat3.normalFromMat4(this._state.nm, this._state.mvp);
    }

    
};

