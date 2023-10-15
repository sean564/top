import { vec2, vec3, mat4 } from "gl-matrix";

const pi = Math.PI;
function cos(t: number): number{
    return Math.cos(t);
}
function sin(t: number): number{
    return Math.sin(t);
}



export class Camera {

    private _position: vec3;
    private _transformation : vec3;

    
    private _spherical : {
        theta : number;
        phi : number;
        radius : number;
    };

    private _mView : mat4;
    private _mProj : mat4;

    private _ray : {
        absPos: vec3;
        normal : vec2;
        toWorld : mat4;
    };

    private _reset: boolean;


    constructor(theta: number = pi/4, phi: number = pi/4, radius : number = 12, transformation : vec3 = [0,0,1.5]) {
        
        this._spherical = {
            theta : theta,
            phi : phi,
            radius : radius,
        }

        this._position = [0,0,0];

        this._ray = {
            absPos : [0,0,0],
            normal : [0,0],
            toWorld :  mat4.create(),
        }
        this._transformation = transformation;

        this._mView = mat4.create();
        this._mProj = mat4.create();

        this._reset = false;

        
        this.updateCameraPos();
        this.setRay();
    }

    public update(gl : WebGLRenderingContext, program : WebGLProgram, width : number, height : number) {
        var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
        var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

        

        gl.viewport(0,0, width, height);

        mat4.perspective(this._mProj,
        pi/4, width/height, 1, 5*this._spherical.radius
        );

        mat4.lookAt(this._mView,
            <vec3>this._position,
            [0,0,0],
            [0,0,1]
        );

        mat4.translate(this._mView, this._mView, this._transformation);

        gl.uniformMatrix4fv(matViewUniformLocation, false, this._mView);
        gl.uniformMatrix4fv(matProjUniformLocation, false, this._mProj);
    }

    public resetCam(gl : WebGLRenderingContext, program : WebGLProgram, width : number, height : number){
        const factor = 30;
        const dtheta = (pi/4 - this._spherical.theta);
        const dphi =(pi/4 - this._spherical.phi);
        const drad = (12 - this._spherical.radius);

        if((dtheta < -pi) || (dtheta >= 0)){
            this._spherical.theta += Math.sqrt(Math.abs(dtheta))/factor;
        }else{
            this._spherical.theta -= Math.sqrt(Math.abs(dtheta))/factor;
        }
        this._spherical.phi += Math.sign(dphi)*Math.sqrt(Math.abs(dphi))/factor;
        this._spherical.phi = Math.min(Math.max(0.0001, this._spherical.phi), pi - 0.0001);
        this._spherical.radius += drad/factor;

        var dtrans = vec3.subtract(vec3.create(), [0,0,1.5], this._transformation);

        vec3.scaleAndAdd(this._transformation, this._transformation, dtrans, 1/factor/1.6);
        if(
            (Math.abs(dtheta) < 0.001)
            && (Math.abs(dphi) < 0.001)
            && (Math.abs(drad) < 0.01)
            && (vec3.len(dtrans) < 0.01)
        ){
            this.reset = false;
        }
        this.updateCameraPos();
        this.update(gl, program, width, height);
    }


    private updateCameraPos(){

        if(this._spherical.theta > 2*pi){
            this._spherical.theta=this._spherical.theta-2*pi;
        }if(this._spherical.theta < 0){
            this._spherical.theta=2*pi-this._spherical.theta;
        }

        this._position[0] = this._spherical.radius * sin(this._spherical.phi) * cos(this._spherical.theta);
        this._position[1] = this._spherical.radius * sin(this._spherical.phi) * sin(this._spherical.theta);
        this._position[2] = this._spherical.radius * cos(this._spherical.phi);

    }

    public addAngle(dtheta : number, dphi : number){

        // update the latest angle
        this._spherical.phi = this._spherical.phi - dphi*Math.sqrt(this._spherical.radius);
        this._spherical.theta = this._spherical.theta - dtheta*Math.sqrt(this._spherical.radius);
        this._spherical.phi = Math.min(Math.max(0.0001, this._spherical.phi), pi - 0.0001);
        this.updateCameraPos();
    }

    public addRadius(dradius : number){
        this._spherical.radius += dradius * 0.0005 * this._spherical.radius;
        this._spherical.radius = Math.min(Math.max(2, this._spherical.radius), 35);
        this.updateCameraPos();
    }

    public transform(dx : number, dy : number, transform_z : boolean){

        if(transform_z){
          this._transformation[2] = this._transformation[2] - sin(this._spherical.phi)*dy*this._spherical.radius;
        }else{

          this._transformation[0] = this._transformation[0] - sin(this._spherical.theta)*dx*this._spherical.radius;
          this._transformation[0] = this._transformation[0] + cos(this._spherical.theta)*dy*this._spherical.radius;

          this._transformation[1] = this._transformation[1] + cos(this._spherical.theta)*dx*this._spherical.radius;
          this._transformation[1] = this._transformation[1] + sin(this._spherical.theta)*dy*this._spherical.radius;
        }

        this._transformation[0] = Math.min(Math.max(-15, this._transformation[0]), 15);
        this._transformation[1] = Math.min(Math.max(-15, this._transformation[1]), 15);
        this._transformation[2] = Math.min(Math.max(-15, this._transformation[2]), 15);

    }

    public setRay(){
        mat4.invert(this._ray.toWorld, mat4.multiply(mat4.create(), this._mProj, this._mView));
        vec3.subtract(this._ray.absPos, this._position, this._transformation);
        vec2.normalize(this._ray.normal, [this._position[0], this._position[1]]);
    }

    get toWorld() : mat4{
        return this._ray.toWorld;
    }

    get absPos() : vec3{
        return this._ray.absPos;
    }

    get normal(){
        return this._ray.normal;
    }

    get reset(){
        return this._reset;
    }
    set reset(bool : boolean){
        this._reset = bool;
    }



}