import { glUtils } from "../utils/glUtils"
import { mat4, mat3, vec3 } from "gl-matrix";

export class Sphere{

    private _rad : number;
    private _SBO! : SBO;

    public static SBOList : SBO[] = [];

    private _state : {
        position : vec3;
        mvp : mat4;
        nm : mat3;
    }


    constructor(
            color : vec3 = [0.10, 0.2, 0.3],
            rad : number = 0.1,
            pos : vec3 = [0,0,0]
        ){

            this._rad = rad;
            this._SBO = SBO.check(color);

        this._state = {
            position: pos,
            mvp: mat4.create(),
            nm: mat3.create()
        };

        this.updateMat();
    }

    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {

        if(!this._SBO.init){
            this._SBO.initBuffers(gl, program);
        }

        var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
        var uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix'); 

        this._SBO.bindBuffers(gl, program);

        gl.uniformMatrix4fv(matWorldUniformLocation, false, this._state.mvp);
        gl.uniformMatrix3fv(uNormalMatrix, false, this._state.nm);
        
        gl.drawElements(gl.TRIANGLES, this._SBO.numVert, gl.UNSIGNED_SHORT, 0);
    };

    private updateMat(){
        mat4.fromTranslation(this._state.mvp, this._state.position);
        mat4.scale(this._state.mvp, this._state.mvp, [this._rad, this._rad, this._rad]);
        mat3.normalFromMat4(this._state.nm, this._state.mvp);
    }

    get color(){
        return this._SBO.color;
    }

    get position() : vec3{
        return this._state.position;
    }

    set position(pos : vec3){
        if(!pos){
            alert("error in Sphere.ts set position");
            return;
        }
       this._state.position = pos;
       this.updateMat();

    }

    public changeColor(color : vec3){
        this._SBO = SBO.check(color);
    }

    
};

export class SBO{

    private _attributes : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
    };

    private _indices : Uint16Array;
    private _color : vec3;
    private _init :boolean;

    private _buffers! : { [name: string]: WebGLBuffer};
    private _indexBuffer! : WebGLBuffer | null;

    private _numVert! : number;

    constructor(color : vec3){

        this._init = false;

        this._color = color;
        
        
        const stackCount = 16;
        const sectorCount = 20;
        const radius = 1;

        let lengthInv = 1.0 / radius;
        let sectorStep = 2 * Math.PI / sectorCount;
        let stackStep = Math.PI / stackCount;
        let sectorAngle : number, stackAngle : number;
        
        var vertices : number[] = [];
        var normals : number[]= [];
        var colors : number[] = [];
        var indices : number[] = [];



        var xy: number;
        var z : number;
        var x : number;
        var y : number;

        for(let i=0; i <= stackCount; ++i)
        {
            stackAngle = Math.PI / 2 - i * stackStep;   // starting from pi/2 to -pi/2
            xy = radius * Math.cos(stackAngle);    // r * cos(u)
            z = radius * Math.sin(stackAngle);     // r * sin(u)

            // add (sectorCount+1) vertices per stack
            // the first and last vertices have same position and normal, but different tex coords
            for(let j=0; j <= sectorCount; ++j)
            {
                sectorAngle = j * sectorStep;           

                x = xy * Math.cos(sectorAngle);         
                y = xy * Math.sin(sectorAngle);         
                vertices.push(x, y, z);

                normals.push(x * lengthInv, y * lengthInv, z * lengthInv);
                colors.push(this._color[0], this._color[1], this._color[2], 1);

            }
        }

        var k1 : number;
        var k2 : number;


        for(let i=0; i < stackCount; ++i)
        {
            k1 = i * (sectorCount + 1);            
            k2 = k1 + sectorCount + 1;           

            for(let j=0; j < sectorCount; ++j, ++k1, ++k2)
            {
                // 2 triangles per sector excluding 1st and last stacks
                if(i != 0)
                {
                    // this.addIndices(kk, k1, k2, k1+1);  // k1---k2---k1+1
                    // kk += 3;
                    indices.push(k1, k2, k1+1);
                }

                if(i != (stackCount-1))
                {
                    // this.addIndices(kk, k1+1, k2, k2+1);// k1+1---k2---k2+1
                    // kk += 3;
                    indices.push(k1+1, k2, k2+1);
                }
            }
        }

        this._attributes = {
            aColor: {
                size:4,
                offset:0,
                bufferData: new Float32Array(colors),
            },
            aPosition: {
                size:3,
                offset:0,
                bufferData: new Float32Array(vertices),
            },
            aNormal: {
                size:3,
                offset:0,
                bufferData: new Float32Array(normals),
            },
        };
    
        this._indices = new Uint16Array(indices);
        this._numVert = this._indices.length;
    }

    public initBuffers(gl: WebGLRenderingContext, program :  WebGLProgram){
        [this._buffers, this._indexBuffer] = glUtils.initBuffers(gl, program, this._attributes, this._indices);
        this._init = true;
    }

    public bindBuffers(gl: WebGLRenderingContext, program : WebGLProgram){
        glUtils.bindBuffers(gl, program, this._attributes, this._buffers, this._indexBuffer);
    }

    public static check(color : vec3) : SBO{
        var temp: SBO;
        var i;
        for(i = 0; i< Sphere.SBOList.length; i++){
            temp = Sphere.SBOList[i];
            if(vec3.dist(temp.color, color) < 0.0001){
                return temp;
            }
        }
        
        const sbo = new SBO(color);
        Sphere.SBOList.push(sbo);
        return sbo;
        
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


