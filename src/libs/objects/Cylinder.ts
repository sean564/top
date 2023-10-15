import { glUtils } from "../utils/glUtils"
import { mat4, mat3, vec3, quat } from "gl-matrix";

export class Cylinder{

    private _CBO! : CBO;
    public static CBOList : CBO[] = [];


    private _state : {
        start : vec3;
        end : vec3;
        rotQuat : quat;
        scale : vec3;
        mvp : mat4;
        nm : mat3;
    }



    constructor(
            color : vec3 = [0.18, 0.1, 0.18],
            start : vec3 = [0,0,0],
            end : vec3 = [0,0,1]
        ){


        this._CBO = CBO.check(color);

        this._state = {
            start: start,
            end: end,
            rotQuat: quat.create(),
            scale: vec3.create(),
            mvp: mat4.create(),
            nm: mat3.create()
        };

        this.updateMat();
    
    }




    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {

        if(!this._CBO.init){
            this._CBO.initBuffers(gl, program);
        }

        var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
        var uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix'); 

        this._CBO.bindBuffers(gl, program);
        
        gl.uniformMatrix4fv(matWorldUniformLocation, false, this._state.mvp);
        gl.uniformMatrix3fv(uNormalMatrix, false, this._state.nm);
        
        gl.drawElements(gl.TRIANGLES, this._CBO.numVert, gl.UNSIGNED_BYTE, 0);
    };

    get color() : vec3{
        return this._CBO.color;
    }

    get start() : vec3{
        return this._state.start;
    }
    get end() : vec3{
        return this._state.end;
    }

    private updateMat(){
        vec3.subtract(
            this._state.scale,
            this._state.end,
            this._state.start
        );

        quat.rotationTo(
            this._state.rotQuat,
            [0,0,1],
            vec3.normalize(vec3.create(), this._state.scale)
        );
 
        mat4.fromRotationTranslationScale(
            this._state.mvp, 
            this._state.rotQuat, 
            this._state.start, 
            [1,1,vec3.length(this._state.scale)]
        );

        mat3.normalFromMat4(this._state.nm, this._state.mvp);
    }

    set start(start : vec3){
        if(!start){
            alert("error in Cylinder.ts set start");
            return;
        }
       this._state.start = start;

       this.updateMat();
    }

    set end(end : vec3){
        if(!end){
            alert("error in Cylinder.ts set end");
            return;
        }
       this._state.end = end;

       this.updateMat();
    }

    public changeColor(color : vec3){
        this._CBO = CBO.check(color);
    }
    
};


export class CBO{

    private _attributes : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
    };

    private _indices : Uint8Array;
    private _color : vec3;
    private _init :boolean;

    private _buffers! : { [name: string]: WebGLBuffer};
    private _indexBuffer! : WebGLBuffer | null;

    private _numVert! : number;

    constructor(color : vec3){

        this._init = false;

        this._color = color;
        
        

        const sectorCount = 16;
        const rad = 0.03;

        let sectorAngle = 0;


        var vertices : number[] = [];
        var normals : number[]= [];
        var colors : number[] = [];
        var indices : number[] = [];

        var z : number;
        var x : number;
        var y : number;

        for(let i=0; i <= 1; ++i)
        {
            z = i;

            for(let j=0, k=0; j <= sectorCount; ++j, k+=3)
            {
                sectorAngle = j/sectorCount * 2 * Math.PI;

                x = Math.cos(sectorAngle);
                y = Math.sin(sectorAngle)

                vertices.push(rad * x, rad * y, z);
                normals.push(x, y, 0)


                colors.push(this.color[0], this.color[1], this.color[2], 1);

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
            }
        };
    
        this._indices = new Uint8Array(indices);

        this._numVert = this._indices.length;
    }

    public initBuffers(gl: WebGLRenderingContext, program :  WebGLProgram){
        [this._buffers, this._indexBuffer] = glUtils.initBuffers(gl, program, this._attributes, this._indices);
        this._init = true;
    }

    public bindBuffers(gl: WebGLRenderingContext, program : WebGLProgram){
        glUtils.bindBuffers(gl, program, this._attributes, this._buffers, this._indexBuffer);
    }

    public static check(color : vec3) : CBO{
        var temp: CBO;
        var i;
        for(i = 0; i< Cylinder.CBOList.length; i++){
            temp = Cylinder.CBOList[i];
            if(vec3.dist(temp.color, color) < 0.0001){
                return temp;
            }
        }
        
        const cbo = new CBO(color);
        Cylinder.CBOList.push(cbo);
        return cbo;
        
    }

    get color(){
        return this._color;
    }

    get init(){
        return this._init; 
    }

    get numVert(){
        return this._numVert;
    }


}


