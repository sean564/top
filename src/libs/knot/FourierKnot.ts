import { vec3, mat4, mat3 } from "gl-matrix";
import { glUtils } from "../utils/glUtils"


const pi = Math.PI;
function cos(t: number): number{
    return Math.cos(t);
}
function sin(t: number): number{
    return Math.sin(t);
}

const KnotDivision = 600;
const Radius = 0.3;
//0.035 for pic
export class FourierKnot{

    private _cosCoef : vec3[];
    private _sinCoef : vec3[];

    private _attributes : {
        aColor : Attribute;
        aPosition : Attribute;
        aNormal : Attribute;
    };

    private _opacity : number;

    private _indices : Uint16Array;

    private _buffers! : { [name: string]: WebGLBuffer};
    private _indexBuffer! : WebGLBuffer | null;

    private _state : {
        mvp : mat4;
        nm : mat3;
        n : number;
    }


    private _calculated : boolean;
    private _intersecting : boolean;



    constructor(){

        this._cosCoef = [];
        this._sinCoef = [];

        this._opacity = 1.0;

        this._attributes = {
            aColor: {
                size:4,
                offset:0,
                bufferData: new Float32Array(),
            },
            aNormal: {
                size:3,
                offset:0,
                bufferData: new Float32Array(),
            },
            aPosition: {
                size:3,
                offset:0,
                bufferData: new Float32Array(),
            },
        };

        this._indices = new Uint16Array();

        this._state = {
            mvp : mat4.create(),
            nm : mat3.create(),
            n : 0,
        }

        this._calculated = false;
        this._intersecting = true;

    }

    public deleteData(){

        this._calculated = false;
        this._intersecting = true;
    }

    public calcFourierFromLinked(arr : vec3[]){


        var cosCoef : vec3[] = [];
        var sinCoef : vec3[] = [];

        var len =  arr.length;

        var curr : vec3;
        var prev : vec3;
        var L : number = 0;

        var maxDist : vec3 = [0, 0, 0];
    
        for(let i =0; i < len; i++){
            curr = arr[i];
            if(i == 0){
                prev = arr[len-1];
            }else{
                prev = arr[i-1];
            }
            L += vec3.distance(curr, prev);

            for (let j =0; j < len; j++){
                let temp =  vec3.subtract(vec3.create(), curr, arr[j]);
                if(Math.abs(temp[0]) > maxDist[0]){
                    maxDist[0] = Math.abs(temp[0]);
                }
                if(Math.abs(temp[1]) > maxDist[1]){
                    maxDist[1] = Math.abs(temp[1]);
                }
                if(Math.abs(temp[2]) > maxDist[2]){
                    maxDist[2] = Math.abs(temp[2]);
                }
            }
        }

        const factor = 10/Math.max(maxDist[0], maxDist[1], maxDist[2]);

        var a : vec3 = vec3.create();
        var b : vec3 = vec3.create();

        var upper_bound : number = 0;
        var lower_bound : number;

        var upper_sum : vec3 = vec3.create();
        var lower_sum : vec3 = vec3.create();

        for(let n = 1; n <=6 ; n++){
            let cos_coef : vec3 = vec3.create();
            let sin_coef : vec3 = vec3.create();

            vec3.zero(cos_coef);
            vec3.zero(sin_coef);  

            for(let i =0; i < len; i++){
                curr = arr[i];
                if(i == 0 ){
                    prev = arr[len-1];
                }else{
                    prev = arr[i-1];
                }
                lower_bound = upper_bound;
                upper_bound += vec3.distance(curr, prev);

                vec3.normalize(a, vec3.subtract(vec3.create(), curr, prev));
                vec3.scaleAndAdd(b, prev, a, -lower_bound);

                vec3.add(upper_sum, vec3.add(vec3.create(), vec3.scale(vec3.create(), b, 2*pi*n*sin(2*pi*n*upper_bound/L)), vec3.scale(vec3.create(), a, 2*pi*n*upper_bound*sin(2*pi*n*upper_bound/L))), vec3.scale(vec3.create(), a, L*cos(2*pi*n*upper_bound/L)));
                vec3.add(lower_sum, vec3.add(vec3.create(), vec3.scale(vec3.create(), b, 2*pi*n*sin(2*pi*n*lower_bound/L)), vec3.scale(vec3.create(), a, 2*pi*n*lower_bound*sin(2*pi*n*lower_bound/L))), vec3.scale(vec3.create(), a, L*cos(2*pi*n*lower_bound/L)));
                
                vec3.scaleAndAdd(cos_coef, cos_coef, vec3.subtract(vec3.create(), upper_sum, lower_sum), 1/(2*pi*pi*n*n));

                vec3.add(upper_sum, vec3.add(vec3.create(), vec3.scale(vec3.create(), b, -2*pi*n*cos(2*pi*n*upper_bound/L)), vec3.scale(vec3.create(), a, -2*pi*n*upper_bound*cos(2*pi*n*upper_bound/L))), vec3.scale(vec3.create(), a, L*sin(2*pi*n*upper_bound/L)));
                vec3.add(lower_sum, vec3.add(vec3.create(), vec3.scale(vec3.create(), b, -2*pi*n*cos(2*pi*n*lower_bound/L)), vec3.scale(vec3.create(), a, -2*pi*n*lower_bound*cos(2*pi*n*lower_bound/L))), vec3.scale(vec3.create(), a, L*sin(2*pi*n*lower_bound/L)));

                vec3.scaleAndAdd(sin_coef, sin_coef, vec3.subtract(vec3.create(), upper_sum, lower_sum), 1/(2*pi*pi*n*n));
            }
            vec3.scale(cos_coef, cos_coef, factor);
            vec3.scale(sin_coef, sin_coef, factor);
            cosCoef.push(cos_coef);
            sinCoef.push(sin_coef);
        }

        this._cosCoef = cosCoef;
        this._sinCoef = sinCoef;


        this._calculated = false;

        // var color : vec3 = [50, 105, 205];
        // vec3.scale(color, color, 1/255);

        var maxHeight = maxDist[2]*factor*1.1;
        if(maxHeight < 0.01){
            maxHeight = 1;
        }

        
        const stack = KnotDivision;
        const sector = 12;
        

        var vertices = [];
        var normals = [];
        var colors = [];
        var indices = [];

        var temp = vec3.create();
        var normVec = vec3.create();

        var prevCurvature : vec3 = [0,0,1];
        var t:vec3;
        var n1:vec3;
        var n2:vec3;
        for (let i = 0; i <= stack; i++) {

            t = vec3.subtract(vec3.create(), this.knot((i)/stack), this.knot((i+1)/stack));
            vec3.normalize(t, t);
            

            n1 = vec3.subtract(vec3.create(), prevCurvature, vec3.scale(vec3.create(), t, vec3.dot(prevCurvature,t)));
            

            if(vec3.length(n1) < 0.000001){
                
                n1 = vec3.subtract(vec3.create(), [0,1,0], vec3.scale(vec3.create(), t, vec3.dot([0,1,0],t)));
                if(vec3.length(n1) < 0.00001){
                    n1 = [1,0,0];
                    n1 = vec3.subtract(vec3.create(), n1, vec3.scale(vec3.create(), t, vec3.dot(n1,t)));
                }
            }
            vec3.normalize(n1, n1);

            n2 = vec3.cross(vec3.create(), n1, t);
            vec3.normalize(n2, n2);

            prevCurvature = n1;
      
            for (let j = 0; j <= sector; j++) {

                const u = j / sector;
                const sector_angle = u * 2 * Math.PI;

                vec3.add(temp, vec3.scale(vec3.create(), n1, cos(sector_angle)), vec3.scale(vec3.create(), n2, sin(sector_angle)));
                vec3.copy(normVec, temp);
                vec3.scale(temp, temp, Radius)

                vec3.add(temp, temp, this.knot(i/stack))

                vertices.push(temp[0], temp[1], temp[2]);

                
                normals.push(normVec[0], normVec[1], normVec[2])

                colors.push(
                    0, 
                    0.75 + temp[2]/maxHeight/2, 
                    0.75 - temp[2]/maxHeight/2, 
                    this._opacity
                ); 

            }

            
        }
          
        const vertsPerStack = sector + 1;

        var k1;
        var k2;

        for (let i = 0; i < stack; ++i) {
            k1 = i * vertsPerStack;
            k2 = k1 + vertsPerStack;
            
            for (let j = 0; j < sector; ++j, ++k1, ++k2) {

                indices.push(k1, k1 + 1, k2);
                indices.push(k2, k1 + 1, k2 + 1);

            }
        }


        this._attributes.aColor.bufferData = new Float32Array(colors);
        this._attributes.aNormal.bufferData = new Float32Array(normals);
        this._attributes.aPosition.bufferData = new Float32Array(vertices);
    
        this._indices = new Uint16Array(indices);

        mat4.identity(this._state.mvp);
        mat3.normalFromMat4(this._state.nm, this._state.mvp);
        this._state.n = this._indices.length;


        this._intersecting = true;
       
        
        this.checkIntersection();

    }


    private knot(param : number) : vec3{
        const t = param * 2 * pi;

        return vec3.add(
            vec3.create(),
            vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(),vec3.scale(vec3.create(), this._cosCoef[5], cos(6*t)), this._cosCoef[4], cos(5*t)), this._cosCoef[3], cos(4*t)), this._cosCoef[2], cos(3*t)), this._cosCoef[1], cos(2*t)), this._cosCoef[0], cos(t)),
            vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(),vec3.scale(vec3.create(), this._sinCoef[5], sin(6*t)), this._sinCoef[4], sin(5*t)), this._sinCoef[3], sin(4*t)), this._sinCoef[2], sin(3*t)), this._sinCoef[1], sin(2*t)), this._sinCoef[0], sin(t))
        )
    }


    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {

        if(!this.calculated){
            [this._buffers, this._indexBuffer] = glUtils.initBuffers(gl, program, this._attributes, this._indices);
            this._calculated = true;
        }
        
        var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
        var uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix'); 

        glUtils.bindBuffers(gl, program, this._attributes, this._buffers, this._indexBuffer);
        
        gl.uniformMatrix4fv(matWorldUniformLocation, false, this._state.mvp);
        gl.uniformMatrix3fv(uNormalMatrix, false, this._state.nm);

        gl.drawElements(gl.TRIANGLES, this._state.n, gl.UNSIGNED_SHORT, 0);
    };


    public exportKIArr(): vec3[][]{

        var dcosCoef : vec3[] = [];
        var dsinCoef : vec3[] = [];

        var d2cosCoef : vec3[] = [];
        var d2sinCoef : vec3[] = [];

        for(let i = 0; i<this._cosCoef.length; i++){
            dcosCoef.push(vec3.scale(vec3.create(), this._sinCoef[i], (i+1)))
            dsinCoef.push(vec3.scale(vec3.create(), this._cosCoef[i], -(i+1)))

            d2cosCoef.push(vec3.scale(vec3.create(), this._cosCoef[i], -(i+1)*(i+1)))
            d2sinCoef.push(vec3.scale(vec3.create(), this._sinCoef[i], -(i+1)*(i+1)))
        }

        return [this._cosCoef, this._sinCoef, dcosCoef, dsinCoef, d2cosCoef, d2sinCoef];
    }

    private checkIntersection(){

        const intervals = KnotDivision*2;
        for(let i =0; i<intervals; i++){
            for(let j = i + Math.round(intervals/50); j< Math.floor(48* intervals/50); j++){
                if(vec3.dist(this.knot(i/intervals), this.knot(j/intervals))<0.05){
                    return;
                }
            }
        }
        this._intersecting = false;

    }

    get intersecting(){
        return this._intersecting;
    }

    get calculated(){
        return this._calculated;
    }
    
}