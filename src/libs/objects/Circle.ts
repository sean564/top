import { glUtils } from "../utils/glUtils"
import { mat4, mat3, quat, vec3 } from "gl-matrix";

export class Circle{


    private _CBO : CBO;

    public static CBOList : CBO[] = [];

    private _state : {
        center : vec3;
        normal : vec3;
        radius : number;
        mvp : mat4;
        nm : mat3;
    }



    constructor(
            radius : number = 1,
            color : vec3 = [0.5, 0.5, 0.5],
        ){

        this._CBO = CBO.check(color, radius);

        this._state = {
            center : [0,0,0],
            normal : [0,0,1],
            radius : radius,
            mvp : mat4.create(),
            nm : mat3.create(),
        }

        mat4.identity(this._state.mvp);
        mat3.normalFromMat4(this._state.nm, this._state.mvp);


    }


    // Functionality

    public setCenterNormalRad(center : vec3, normal : vec3, rad : number){
        var ratio : number;

        ratio = rad/this._state.radius;
        

        mat4.fromRotationTranslationScale(
            this._state.mvp, 
            quat.rotationTo(
                quat.create(),
                [0,0,1],
                normal
            ), 
            center, 
            [ratio,ratio,ratio]
        );

        mat3.normalFromMat4(this._state.nm, this._state.mvp);
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
    
        gl.drawElements(gl.TRIANGLES, this._CBO.numVert , gl.UNSIGNED_SHORT, 0);
    };
    
};


export class CBO{

    private _attributes : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
    };

    private _indices : Uint16Array;
    private _color : vec3;
    private _majorRad : number;
    private _init :boolean;

    private _buffers! : { [name: string]: WebGLBuffer};
    private _indexBuffer! : WebGLBuffer | null;

    private _numVert! : number;

    constructor(color : vec3, rad : number){

        this._init = false;

        this._color = color;
        this._majorRad = rad;
        


        var slices= 10;
        var loops = Math.max(Math.min(Math.round(60*Math.sqrt(rad)), 500), 50);
        var inner_rad= 0.02;
        var outerRad = rad;
        
        var vertices = [];
        var normals = [];
        var colors = [];
        var indices = [];
            
      
        for (let slice = 0; slice <= slices; ++slice) {
            const v = slice / slices;
            const slice_angle = v * 2 * Math.PI;
            const cos_slices = Math.cos(slice_angle);
            const sin_slices = Math.sin(slice_angle);
            const slice_rad = outerRad + inner_rad * cos_slices;
      
            for (let loop = 0; loop <= loops; ++loop) {
              //   x=(R+r·cos(v))cos(w)
              //   y=(R+r·cos(v))sin(w)
              //             z=r.sin(v)
                const u = loop / loops;
                const loop_angle = u * 2 * Math.PI;
                const cos_loops = Math.cos(loop_angle);
                const sin_loops = Math.sin(loop_angle);
        
                const x = slice_rad * cos_loops;
                const y = slice_rad * sin_loops;
                const z = inner_rad * sin_slices;
        

                vertices.push(x, y, z);
                
                normals.push(cos_loops * cos_slices, sin_loops * cos_slices, sin_slices)

                colors.push(
                    this._color[0], 
                    this._color[1], 
                    this._color[2], 
                    1
                );


            }
            
        }

      
        const vertsPerSlice = loops + 1;

        var k1;
        var k2;

        for (let i = 0; i < slices; ++i) {
            k1 = i * vertsPerSlice;
            k2 = k1 + vertsPerSlice;
            
            for (let j = 0; j < loops; ++j, ++k1, ++k2) {

                indices.push(k1, k1 + 1, k2);
                indices.push(k1 + 1, k2 + 1, k2);  

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

    public static check(color : vec3, rad : number) : CBO{
        var temp: CBO;
        var i;
        for(i = 0; i< Circle.CBOList.length; i++){
            temp = Circle.CBOList[i];
            if((vec3.dist(temp.color, color) < 0.0001) && (Math.abs(temp.radius - rad) < 0.001)){
                return temp;
            }
        }
        
        const cbo = new CBO(color, rad);
        Circle.CBOList.push(cbo);
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

    get radius(){
        return this._majorRad;
    }


}

