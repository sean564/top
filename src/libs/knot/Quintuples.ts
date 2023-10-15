
import Compute from "../../shaders/firstCompute.wgsl"
import { vec3, vec4, mat4 } from "gl-matrix";
import { Circle } from "../objects/Circle"
import { Sphere } from "../objects/Sphere"
import { DropDown, Loader } from "../controls/Overlay"



const circleRadLimit = 80;
const GPUloop = 40;
const pi = Math.PI;


function cos(t: number) {
    return Math.cos(t);
}

function sin(t: number) {
    return Math.sin(t);
}

type vec5 = [number, number, number, number, number];


function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

export class Quintuples{

    private _frames : Frames;

    private _circles : Circle[];
    private _spheres : {
        red : Sphere;
        black : Sphere;
    };

    private _player : Player;

    
    constructor(){

        this._frames = [];

        this._circles = new Array(circleRadLimit);
        for(let i  = 0; i < circleRadLimit; i++){
            this._circles[i] = new Circle(Math.pow(2, (i-10)/5), [0.5,0.5,0.5])
        }
        this._spheres = {
            red : new Sphere([1,0,0], 0.1),
            black : new Sphere([0.2, 0.2, 0.2], 0.08)
        }

        this._player = new Player();

        this._player.initCallback();
         
    }



    set frames(frames : Frames){
        this._frames = frames;
    }
    get frames(){
        return this._frames;
    }




    public setFrameData(frames : Frames, knotDivision : number){

        this.frames = frames;
        this.player.Disable(false);
        this.player.max = knotDivision;
        this.player.reset();
           
    }



    public draw(gl: WebGLRenderingContext, program :  WebGLProgram) {

        var objs = this._frames[this._player.frame]
        
        var tempCircle : {
            center : vec3;
            normal :vec3;
            radius : number;
            radID : number;
        };

        for(let i =0; i<objs.circles.length; i++){
            tempCircle = objs.circles[i];
            this._circles[tempCircle.radID].setCenterNormalRad(tempCircle.center, tempCircle.normal, tempCircle.radius);
            this._circles[tempCircle.radID].draw(gl, program);
        }

        for(let i =0; i<objs.blackPoints.length; i++){
            this._spheres.black.position = objs.blackPoints[i].position;
            this._spheres.black.draw(gl, program);
        }

        this._spheres.red.position = objs.redPoints.position;
        this._spheres.red.draw(gl, program);

        if(this._player.play){
            this._player.addFrame();
        }

    };

    get player(){
        return this._player;
    }


}





export class Player{

    private videoControls : HTMLElement;

    private playpause : HTMLElement;
    private speedDrop : DropDown;
    private progress : HTMLElement;
    private progressBar : HTMLElement;

    private left:number;
    private pressed : boolean;

    private _animation: {
        play : boolean;
        frame : number;
        max : number;
        speed : number;
    };
    

    constructor(){
        this.videoControls = <HTMLElement>document.getElementById('video-controls');
        this.playpause = <HTMLElement>document.getElementById('playpause');

        this.progress = <HTMLElement>document.getElementById('progress');
        this.progressBar = <HTMLElement>document.getElementById('progress-bar');

        this.left = 0;
        this.pressed = false;

        this.speedDrop = new DropDown("speed dropdown", 1);

        this._animation = {
            play : false,
            frame : 0,
            max : 0,
            speed : 1,
        };

        this.videoControls.classList.toggle('hidden', true);
        this.resize();

    }

    public initCallback(){

        this.playpause.addEventListener('click', () => {this.playBtnResponse();});			
   
        this.progress.addEventListener('mousedown', (event) => {if(event.button == 0){this.pressed = true;this.progressResponse(event);}});
        document.addEventListener('mousemove', (event) => {this.progressResponse(event);});
        document.addEventListener('mouseup', ()=>{this.pressed = false;})

    }

    private progressResponse(event : MouseEvent){
        if(this.pressed){
            var pos = (event.clientX - this.left) / this.progress.offsetWidth;
            this.frame = Math.max(Math.min(Math.round(pos * (this._animation.max-1)), this._animation.max-1), 0);
        }
    }

    private playBtnResponse() {
        // Play/Pause button
        this._animation.play = !this._animation.play;
        

    }

    get frame(){
        return Math.floor(this._animation.frame);
    }

    public addFrame(num : number = this.speed){
        if(this._animation.max == 2000){
        }else{
            num /= 2;
        }
        this.frame = this._animation.frame + num;
    }

    set frame(frame : number){
        if(frame < 0){
            frame = 0;
        } else if(frame >= this._animation.max){
            frame = 0;
        }

        this.progressBar.style.width = String(Math.floor((frame / (this._animation.max-1)) * 1000)/10) + '%';
        this._animation.frame = frame;
    }

    get speed(){
        this._animation.speed = this.speedDrop.value;
        return this._animation.speed;
    }

    get play(){
        return this._animation.play;
    }

    set max(max : number){
        this._animation.max = max;
    }

    get max(){
        return this._animation.max;
    }

    set play(bool : boolean){
        this._animation.play = bool;
        if (this._animation.play) {
            this.playpause.setAttribute('data-state', 'play');
        }else {
            this.playpause.setAttribute('data-state', 'pause');
        }
    }

    public Disable(disable : boolean){
        
        this.videoControls.classList.toggle('hidden', disable);
        
    }

    public resize(){
        this.left = this.progress.getBoundingClientRect().left;
    }
    public reset(){
        this.frame = 0;
        this.play = true;
        this._animation.speed=1;
        this.speedDrop.reset();
        this.resize();
    }

    
}

export class WebGPUCalc{

    private _device! : GPUDevice;
    private _adapter! : GPUAdapter;

    private _bindGroupLayout! : GPUBindGroupLayout;
    private _computePipeline! : GPUComputePipeline;

    private _bufferSize : number; //2992500
        // 9576000

    private _calc : {
        error_field : number;
        ACPolyAve : number;
        WrongPoly : number[];
    }

    private _cosCoef : vec3[];
    private _sinCoef : vec3[];

    private _dcosCoef : vec3[];
    private _dsinCoef : vec3[];

    private _d2cosCoef : vec3[];
    private _d2sinCoef : vec3[];

    private _calculated : boolean;

    constructor(){

        this._bufferSize = 0;
        this._calc = {
            error_field : 0.0000001,
            ACPolyAve : 0,
            WrongPoly : [],
        }

        this._cosCoef = [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
        this._sinCoef = [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];

        this._dcosCoef = [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
        this._dsinCoef = [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];

        this._d2cosCoef = [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
        this._d2sinCoef = [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];

        this._calculated = false;
         
    }


        
    public async Initialize(){

        if (!navigator.gpu) {
            throw new Error('WebGPU not supported.');
        }
        this._adapter = <GPUAdapter> await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
        if (!this._adapter) {
            throw new Error('Couldn\'t request WebGPU adapter.');
        }

        this._device = <GPUDevice> await this._adapter.requestDevice();
        if (!this._device) {
            throw new Error('Couldn\'t request WebGPU device.');
        }else{
            const newKnotBtn = <HTMLButtonElement>document.getElementById("NewKnot");
            newKnotBtn.classList.toggle('disabled', false);
            const txtcnt = newKnotBtn.querySelector("#New-Knot-txt")
            if(txtcnt){
                txtcnt.textContent = "Draw new knot";
            }
        }


        
    }

    public initKnot(coefs: vec3[][]){

        this._cosCoef = coefs[0];
        this._sinCoef = coefs[1];

        this._dcosCoef = coefs[2];
        this._dsinCoef = coefs[3];

        this._d2cosCoef = coefs[4];
        this._d2sinCoef = coefs[5];

    }

    private KI() : Float32Array{
        var ret : number[] = [];
        for(let i =0; i<6; i++){
            ret.push(this._cosCoef[i][0], this._cosCoef[i][1], this._cosCoef[i][2], 0)
        }
        for(let i =0; i<6; i++){
            ret.push(this._sinCoef[i][0], this._sinCoef[i][1], this._sinCoef[i][2], 0)
        }
        return new Float32Array(ret);
    }

    get calculated(){
        return this._calculated;
    }

    get wrongPoly(){
        return this._calc.WrongPoly;
    }

    set calculated(bool : boolean){
        this._calculated = bool;
    }
    
    public async findCircles(quintuples : Quintuples, doubleCheck: boolean, maxCircles: number, knotDivision: number, loader : Loader){

        loader.text = (0).toFixed(1) + " %";
        await Loader.timeout(10);

        this._bufferSize = 5985 * 5 * knotDivision/2/GPUloop;
        const KI = this.KI();
        
     
        var temp_data : number[][][] = new Array(knotDivision);

        this._bindGroupLayout = this._device.createBindGroupLayout({
            entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform"
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage"
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            }]
        });

        const shaderModule = this._device.createShaderModule({
            code: Compute
        });

        this._computePipeline = this._device.createComputePipeline({
            layout: this._device.createPipelineLayout({
                bindGroupLayouts: [this._bindGroupLayout]
            }),
            compute: {
                module: shaderModule,
                entryPoint: 'main',
                constants: {
                    BUFFER_SIZE : this._bufferSize,
                },
            },
        });



        for (let i = 0 ; i<knotDivision; i++){
            temp_data[i] = [];
        }

        for(let calc_iter = 0; calc_iter < GPUloop; calc_iter++){

            const [, tlist] = this.sett_i(knotDivision/2, knotDivision/2/GPUloop, knotDivision/2/GPUloop*calc_iter);

            const commandEncoder = this._device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();

            
            let ki : GPUBuffer = this._device.createBuffer({
                size: 48 * Float32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
        
            this._device.queue.writeBuffer(ki, 0, KI);
    
    
            let input : GPUBuffer = this._device.createBuffer({
                size:  this._bufferSize * Float32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            let output : GPUBuffer = this._device.createBuffer({
                size: this._bufferSize * Float32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
            let staging : GPUBuffer = this._device.createBuffer({
                size: this._bufferSize * Float32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });
    

            this._device.queue.writeBuffer(input, 0, tlist);

            const bindGroup = this._device.createBindGroup({
                layout: this._bindGroupLayout,
                entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: ki,
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: input,
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: output,
                    }
                }]
            });

                
            passEncoder.setPipeline(this._computePipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.dispatchWorkgroups(200,200);

            // End the render pass
            passEncoder.end();

            // Copy output buffer to staging buffer
            commandEncoder.copyBufferToBuffer(
                output,
                0, // Source offset
                staging,
                0, // Destination offset
                this._bufferSize*Float32Array.BYTES_PER_ELEMENT
            );

            // 8: End frame by passing array of command buffers to command queue for execution
            this._device.queue.submit([commandEncoder.finish()]);

            // map staging buffer to read results back to JS
            await staging.mapAsync(
                GPUMapMode.READ,
                0, // Offset
                this._bufferSize*Float32Array.BYTES_PER_ELEMENT // Length
            );

            var data = new Float32Array(staging.getMappedRange(0, this._bufferSize*Float32Array.BYTES_PER_ELEMENT).slice(0));


            for(let i = 0; i < data.length/5; i++){
                if((data[5*i] == 1.0)){
                    continue;
                } 
                var ind = Math.round(data[5*i]*knotDivision);
                if((ind >= knotDivision) || (ind < 0)){
                    continue;
                }
                temp_data[ind].push([data[5*i], data[5*i+1], data[5*i+2], data[5*i+3], data[5*i+4]]);

            }

            loader.text = (calc_iter*100/GPUloop).toFixed(1) + " %";
            await Loader.timeout(10);
            if(loader.cancel){
                return;
            }
        }

        var ACPolyOpt = new Array(2);
        ACPolyOpt[0] = [];
        ACPolyOpt[1] = [];


        for(let i = 0; i<knotDivision; i+=2){

            temp_data[i] = this.removeDupe(temp_data[i], 0.01);
            temp_data[i] = temp_data[i].slice(0, maxCircles * 2);
            temp_data[i] = this.c5_ptolemy(temp_data[i]);
            temp_data[i] = this.removeDupe(temp_data[i], 0.002);
            temp_data[i] = temp_data[i].slice(0, maxCircles);
            this._calc.ACPolyAve += temp_data[i].length % 2;

            ACPolyOpt[temp_data[i].length % 2].push(i);

            if(loader.cancel){
                return;
            }
        }


        var frameIndex : number;
        var leftIndex :number;
        var rightIndex :number;
        var maxIndex : number;
        var tempDoubleCheckData : number[][];


        for(let i = 1; i<knotDivision; i+=2){

            leftIndex = i-1;
            rightIndex = i+1;

            if(rightIndex == knotDivision){
                rightIndex = 0;
            }

            tempDoubleCheckData = [];
            if(temp_data[leftIndex].length < temp_data[rightIndex].length){
                maxIndex = rightIndex;
            }else{
                maxIndex = leftIndex;
            }
            let temp : number[];
                
            for(let j = 0; j< temp_data[maxIndex].length; j++){
                temp = temp_data[maxIndex][j];
                tempDoubleCheckData.push([i/knotDivision, temp[1], temp[2], temp[3], temp[4]]);
            }

            tempDoubleCheckData = this.c5_ptolemy(tempDoubleCheckData);
            temp_data[i] = this.removeDupe(tempDoubleCheckData, 0.002);
            temp_data[i] = temp_data[i].slice(0, maxCircles);
            
            ACPolyOpt[temp_data[i].length % 2].push(i);

            if(loader.cancel){
                return;
            }
        }


        this._calc.ACPolyAve = Math.round(this._calc.ACPolyAve/knotDivision*2);
        ACPolyOpt[(this._calc.ACPolyAve +1)%2]=ACPolyOpt[(this._calc.ACPolyAve +1)%2].sort(function(a: number, b: number){return a - b});
        this._calc.WrongPoly = ACPolyOpt[(this._calc.ACPolyAve +1)%2];

        if(doubleCheck){

            loader.text = "verifying number of circles";
            await Loader.timeout(10);


            const wrongACPoly = ACPolyOpt[(this._calc.ACPolyAve +1)%2];
            this._calc.WrongPoly = [];

            for(let i = 0; i<wrongACPoly.length; i++){

                tempDoubleCheckData = [];

                frameIndex = wrongACPoly[i];
                leftIndex = mod(frameIndex-1, knotDivision);
                rightIndex = mod(frameIndex+1, knotDivision);

                maxIndex = leftIndex;
                let doubiter = 0
                
                do{
                    if(temp_data[leftIndex].length < temp_data[rightIndex].length){
                        maxIndex = rightIndex;
                        rightIndex = mod(rightIndex+1, knotDivision);
                    }else{
                        maxIndex = leftIndex;
                        rightIndex = mod(rightIndex-1, knotDivision);
                    }
                    doubiter++;
                }while((doubiter < 10) && (temp_data[maxIndex].length%2 != this._calc.ACPolyAve))
                

                let temp : number[];
                

                for(let j = 0; j< temp_data[maxIndex].length; j++){
                    temp = temp_data[maxIndex][j];
                    tempDoubleCheckData.push([frameIndex/knotDivision, temp[1], temp[2], temp[3], temp[4]]);
                }

                tempDoubleCheckData = this.c5_ptolemy(tempDoubleCheckData);
                temp_data[frameIndex] = this.removeDupe(tempDoubleCheckData, 0.002);

                if(temp_data[frameIndex].length%2 != this._calc.ACPolyAve){
                    doubiter = 0;

                    while((doubiter < 10) && (temp_data[leftIndex].length%2 != this._calc.ACPolyAve)){
                        doubiter++;
                        leftIndex = mod(leftIndex-1, knotDivision);
                    }
                    maxIndex = leftIndex;
                    tempDoubleCheckData = [];
                    for(let j = 0; j< temp_data[maxIndex].length; j++){
                        temp = temp_data[maxIndex][j];
                        tempDoubleCheckData.push([frameIndex/knotDivision, temp[1], temp[2], temp[3], temp[4]]);
                    }
    
                    tempDoubleCheckData = this.c5_ptolemy(tempDoubleCheckData);
                    temp_data[frameIndex] = this.removeDupe(tempDoubleCheckData, 0.002);
                }

                if(temp_data[frameIndex].length%2 != this._calc.ACPolyAve){
                    this._calc.WrongPoly.push(frameIndex);
                }

                if(loader.cancel){
                    return;
                }

            }
        }


        loader.text = "creating buffers";
        await Loader.timeout(10);

        this._calculated = false;


        this.exportFrame(quintuples, temp_data, knotDivision, loader);
        if(loader.cancel){
            return;
        }

        quintuples.player.max = knotDivision;

        this._calculated = true;
        quintuples.player.play = true;


    }



    private removeDupe(list : number[][], aprox : number) : number[][]{

        let temp =[];

        for(var i = 0; i < list.length; i++){
            var include = true;
            let len2 = temp.length;
            for(var j = 0; j < len2; j++){
                const diff = Math.sqrt(
                    Math.pow(list[i][1]-temp[j][1], 2)
                    + Math.pow(list[i][2]-temp[j][2], 2)
                    + Math.pow(list[i][3]-temp[j][3], 2)
                    + Math.pow(list[i][4]-temp[j][4], 2)
                )
                
                if(diff < aprox){
                    include = false;
                }
            }
            if(include){
                temp.push(list[i]);
            }
            
        }
        return temp;

    }


    private sett_i(knotDivision: number, t_0num : number, offset : number) : [number, Float32Array]{
        var ind2 : number, ind3 : number, ind4 : number, ind5 : number;
        var ind1 : number;
        var length = 0;

        const partitions = 22;

        const t_i = new Float32Array(5985*t_0num*5);
        length = 0;
        for(ind1 = 0; ind1< t_0num; ind1++)
        {
            for (ind2=1;ind2<partitions;ind2++)
            {
                for (ind3=ind2+1;ind3<partitions;ind3++)
                {
                    for (ind4=ind3+1;ind4<partitions;ind4++)
                    {
                        for (ind5=ind4+1;ind5<partitions;ind5++)
                        {		
                            t_i[length] = offset/knotDivision + ind1/knotDivision;
                            t_i[length+1] = ind2/partitions+t_i[length];
                            t_i[length+2] = ind3/partitions+t_i[length];
                            t_i[length+3] = ind4/partitions+t_i[length];
                            t_i[length+4] = ind5/partitions+t_i[length];

                            length+=5;
                        }
                    }
                }
            }
        }

        return [length, t_i];
    }

    private exportFrame(quintuples : Quintuples, data : number[][][], knotDivision : number, loader : Loader){

        var c : vec3;
        var n : vec3;
        var r : number;

        var frame : Frames = Array(knotDivision);

        var tempSphere : {
            position : vec3;
        }[];

        var radID;
        
        for(let iter  = 0; iter < knotDivision; iter++){

            frame[iter] = {
                redPoints : {
                    position : this.knot(iter/knotDivision)
                },
                blackPoints : [],
                circles : [],
            }

            tempSphere = [];

            var frameData = data[iter];
            for(let i = 0; i< frameData.length; i++){

                var include : boolean[] = [true, true, true, true]

                c = [frameData[i][5],frameData[i][6],frameData[i][7]];
                n = [frameData[i][8],frameData[i][9],frameData[i][10]];
                r = frameData[i][11];

                radID = Math.max(0, Math.min(Math.floor(5*Math.log2(r)) + 10, circleRadLimit-1));

                frame[iter].circles.push({center : c, normal : n, radius : r, radID : radID});

                for(let j = 0; j < tempSphere.length; j++){
                    for(let k = 0; k <4; k++){
                        if(vec3.dist(tempSphere[j].position, this.knot(frameData[i][k+1])) < 0.001){
                            include[k] = false;
                        }

                    }
                }
                for(let k = 0; k <4; k++){
                    if(include[k]){
                        tempSphere.push({position : this.knot(frameData[i][k+1])});
                    }

                }
            } 

            frame[iter].blackPoints = tempSphere;

            if(loader.cancel){
                return;
            }

        }

        quintuples.frames = frame;


           
    }






    private toCVR(v1 : vec3, v2 : vec3, v3 : vec3) : [vec3, vec3, number]{

        const v12 = subtract(v1, v2);
        const v23 = subtract(v2, v3);
        const v31 = subtract(v3, v1);
                    
        // A perp vect...
        var v = crossprod(v12,v23);
        
        // The radius...
        const r = .5*(lenv(v12)*lenv(v23)*lenv(v31))/lenv(v);
        
        // The center...
        const alpha = -0.5*((lenv(v23)*lenv(v23))*dot(v12,v31))/dot(v,v);
        const beta = -0.5*((lenv(v31)*lenv(v31))*dot(v12,v23))/dot(v,v);
        const gamma = -0.5*((lenv(v12)*lenv(v12))*dot(v31,v23))/dot(v,v);
        
        const c = addv(addv(scalarmult(alpha,v1),scalarmult(beta,v2)),scalarmult(gamma,v3));
        
        // Normalize v now
        v = normalize(v);

        return [c, v, r];
    }

    private decim(t_i : vec5){
        
        for(var i=1; i<5; i++){
            t_i[i] %= 1;
            if(t_i[i] < 0){
                t_i[i] += 1;
            }
        }
    }

    private proxim(t_i : vec5, proxim_double : number) :boolean{
        for(var i = 0 ; i < 5; i++){
            for(var j = i+1; j < 5; j++){
                if(
                    (Math.abs(t_i[i] - t_i[j]) < proxim_double )||
                    (Math.abs(t_i[i] - t_i[j] + 1 ) < proxim_double)||
                    (Math.abs(t_i[j] - t_i[i] + 1 ) < proxim_double)
                ){
                    return true;
                }
            }
        }
        return false;
    }



    private modified_Cholesky(A : mat4, X : vec4) : vec4 {
        // Solves the system of equations using modified Cholesky decomposition as presented in 
        //"Gill, P. E., Murray, W., and Wright, M. H. (1981). Practical optimization. Academic Press."

        if((A.length != 16) || (X.length != 4)){
            throw new Error("dimension error in modified_Cholesky")
        }

        var max_diag = 0.0;
        var max_nondiag = 0.0;
        var i, j, k, s;

        for (i = 0; i < 4; i++)
        {
            if(Math.abs(A[i*4+i]) > max_diag){
                max_diag = Math.abs(A[i*4+i]);
            }
            for(j =0; j < 4; j++){
                if((Math.abs(A[i*4+j]) > max_nondiag) && (j!= i)){
                    max_nondiag = Math.abs(A[i*4+j]);
                }
            }
        }

        var beta2 = Math.max(max_diag, max_nondiag/(Math.sqrt(4*4-1)), 0.0001);

        var temp = new Array(16);
        var D = new Array(4);
        var L = new Array(16);

        var theta = [0, 0, 0, 0];

        for(j =0; j<4; j++){
            temp[j*4 + j] = A[j*4 + j];
            for(s = 0; s< j; s++){
                temp[j*4 + j] -= D[s]*L[j*4 + s]*L[j*4 + s];
            }
            
            for(i=j+1; i<4; i++){
                temp[i*4 + j] = A[i*4 + j];
                for(s = 0; s< j; s++){
                    temp[i*4 + j] -= D[s]*L[i*4 + s]*L[j*4 + s];
                }

                if(theta[j]< Math.abs(temp[i*4 + j])){
                    theta[j]= Math.abs(temp[i*4 + j]);
                }
            }

            D[j] = Math.max(Math.abs(temp[j*4 + j]), theta[j]*theta[j]/beta2, 0.001);
            
            for(i=j+1; i<4; i++){
                L[i*4 + j] = temp[i*4 + j]/D[j];
            }
            L[j*4 + j] = 1.0;
        }

        // forward substitution.
        var y = new Array(4);
        var sum;

        for (i = 0; i < 4; i++)
        {
            sum = X[i];
            for (j = 0; j < i; j++){
                sum -= L[i*4+j] * y[j];
            }
            y[i] = sum / L[i*4 +i];
        }


        // back substitution.
        var retval : vec4 = [0,0,0,0];

        for (k = 4 - 1; k >= 0; k--)
        {
            sum = y[k];
            for (j = k + 1; j < 4; j++){
                sum -= L[j*4+k] * retval[j] * D[k];
            }
            retval[k] = sum / (D[k]);
        }
        return retval;

    }


    private gradient_ptolemy(nv : number[], vdv : number[], grad : vec4){
        
        const dptolemy1423d2 = (-nv[2]/nv[4])*vdv[1]+(-nv[1]/nv[5])*vdv[2]-(nv[7]/nv[0])*vdv[0];
        const dptolemy1423d3 = (nv[2]/nv[4])*vdv[5]+(nv[5]/nv[1])*vdv[4]-(-nv[0]/nv[7])*vdv[6];
        const dptolemy1423d4 = (nv[4]/nv[2])*vdv[8]+(nv[1]/nv[5])*vdv[9]-(nv[0]/nv[7])*vdv[10];

        const dptolemy1253d2 = (nv[8]/nv[0])*vdv[0]+(-nv[1]/nv[6])*vdv[3]-(-nv[3]/nv[4])*vdv[1];
        const dptolemy1253d3 = (-nv[0]/nv[8])*vdv[7]+(nv[6]/nv[1])*vdv[4]-(nv[3]/nv[4])*vdv[5];
        const dptolemy1253d5 = (nv[0]/nv[8])*vdv[13]+(nv[1]/nv[6])*vdv[12]-(nv[4]/nv[3])*vdv[11];


        grad[0] = dptolemy1423d2 + dptolemy1253d2;
        grad[1] = dptolemy1423d3 + dptolemy1253d3;
        grad[2] = dptolemy1423d4;
        grad[3] = dptolemy1253d5;

    }

    private hessian_ptolemy(nv : number[], vdv : number[], dvdv : number[], vd2v : number[], hess : mat4){
        


            const d2ptolemy1423d2d2 = ((-nv[2]/nv[4])*(vd2v[1] - dvdv[0] + (Math.pow(vdv[1], 2)/ Math.pow(nv[4] , 2)))
                +(-nv[1]/nv[5])*(vd2v[2] - dvdv[0] + (Math.pow(vdv[2], 2)/ Math.pow(nv[5] , 2)))
                -(nv[7]/nv[0])*(vd2v[0] + dvdv[0] -(Math.pow(vdv[0], 2)/ Math.pow(nv[0] , 2))));

            const d2ptolemy1423d2d3 = (1/(nv[7]*nv[0])*vdv[6]*vdv[0] 
                + (-nv[2]/nv[4])*(dvdv[1] - (vdv[5]*vdv[1]/ Math.pow(nv[4] , 2))) + 1/(-nv[1]*nv[5])*vdv[4]*vdv[2]);

            const d2ptolemy1423d2d4 = (-1/(nv[7]*nv[0])*vdv[10]*vdv[0] + 1/(-nv[2]*nv[4])*vdv[8]*vdv[1]
                + (-nv[1]/nv[5])*(dvdv[2] - (vdv[9]*vdv[2]/ Math.pow(nv[5] , 2)))); 

            const d2ptolemy1423d3d3 = ((nv[2]/nv[4])*(vd2v[5] + dvdv[4] - (Math.pow(vdv[5], 2)/ Math.pow(nv[4] , 2)))
                +(nv[5]/nv[1])*(vd2v[4] + dvdv[4] - (Math.pow(vdv[4], 2)/ Math.pow(nv[1] , 2)))
                -(-nv[0]/nv[7])*(vd2v[6] - dvdv[4] +(Math.pow(vdv[6], 2)/ Math.pow(nv[7] , 2))));

            const d2ptolemy1423d3d4 = (-(-nv[0]/nv[7])*(dvdv[5] - vdv[10]*vdv[6]/ Math.pow(nv[7] , 2)) 
                + 1/(nv[2]*nv[4])*vdv[8]*vdv[5]+1/(nv[5]*nv[1])*vdv[9]*vdv[4]);
            
            const d2ptolemy1423d4d4 = ((nv[4]/nv[2])*(vd2v[8] + dvdv[7] - (Math.pow(vdv[8], 2)/ Math.pow(nv[2] , 2)))
                +(nv[1]/nv[5])*(vd2v[9] + dvdv[7] - (Math.pow(vdv[9], 2)/ Math.pow(nv[5] , 2)))
                -(nv[0]/nv[7])*(vd2v[10] + dvdv[7] -(Math.pow(vdv[10], 2)/ Math.pow(nv[7] , 2))));



            const d2ptolemy1253d2d2 = ((nv[8]/nv[0])*(vd2v[0] + dvdv[0] - (Math.pow(vdv[0], 2)/ Math.pow(nv[0] , 2)))
                +(-nv[1]/nv[6])*(vd2v[3] - dvdv[0] + (Math.pow(vdv[3], 2)/ Math.pow(nv[6] , 2)))
                -(-nv[3]/nv[4])*(vd2v[1] - dvdv[0] +(Math.pow(vdv[1], 2)/ Math.pow(nv[4] , 2))));
            
            const d2ptolemy1253d2d3 = (-(-nv[3]/nv[4])*(dvdv[1]-vdv[1]*vdv[5]/Math.pow(nv[4] , 2)) 
                + 1/(-nv[8]*nv[0])*vdv[7]*vdv[0]+1/(-nv[1]*nv[6])*vdv[4]*vdv[3]);

            const d2ptolemy1253d2d5 = (-1/(-nv[3]*nv[4])*vdv[11]*vdv[1] + 1/(nv[8]*nv[0])*vdv[13]*vdv[0]
                +(-nv[1]/nv[6])*(dvdv[3]-vdv[3]*vdv[12]/ Math.pow(nv[6] , 2)));

            const d2ptolemy1253d3d3 = ((-nv[0]/nv[8])*(vd2v[7] - dvdv[4] + (Math.pow(vdv[7], 2)/ Math.pow(nv[8] , 2)))
                +(nv[6]/nv[1])*(vd2v[4] + dvdv[4] - (Math.pow(vdv[4], 2)/ Math.pow(nv[1] , 2)))
                -(nv[3]/nv[4])*(vd2v[5] + dvdv[4] -(Math.pow(vdv[5], 2)/ Math.pow(nv[4] , 2))));

            const d2ptolemy1253d3d5 = (-1/(nv[3]*nv[4])*vdv[11]*vdv[5] + (-nv[0]/nv[8])*(dvdv[6]-vdv[7]*vdv[13]/Math.pow(nv[8] , 2))
                +1/(nv[6]*nv[1])*vdv[12]*vdv[4]);

            const d2ptolemy1253d5d5 = ((nv[0]/nv[8])*(vd2v[13] + dvdv[8] - (Math.pow(vdv[13], 2)/ Math.pow(nv[8] , 2)))
                +(nv[1]/nv[6])*(vd2v[12] + dvdv[8] - (Math.pow(vdv[12], 2)/ Math.pow(nv[6] , 2)))
                -(nv[4]/nv[3])*(vd2v[11] + dvdv[8] -(Math.pow(vdv[11], 2)/ Math.pow(nv[3] , 2))));


            hess[0] = d2ptolemy1423d2d2 + d2ptolemy1253d2d2; 
            hess[1] = d2ptolemy1423d2d3 + d2ptolemy1253d2d3;
            hess[2] = d2ptolemy1423d2d4;
            hess[3] = d2ptolemy1253d2d5;

            hess[4] = d2ptolemy1423d2d3 + d2ptolemy1253d2d3;
            hess[5] = d2ptolemy1423d3d3 + d2ptolemy1253d3d3;
            hess[6] = d2ptolemy1423d3d4;
            hess[7] = d2ptolemy1253d3d5;

            hess[8] = d2ptolemy1423d2d4; 
            hess[9] = d2ptolemy1423d3d4;
            hess[10] = d2ptolemy1423d4d4;
            hess[11] = 0.0;

            hess[12] = d2ptolemy1253d2d5; 
            hess[13] = d2ptolemy1253d3d5;
            hess[14] = 0.0;
            hess[15] = d2ptolemy1253d5d5;

        
    }


    private setvariables(t_i : vec5, v: vec3[], nv : number[], vv : vec3[], dv : vec3[], vdv : number[], dvdv : number[], d2v : vec3[], vd2v : number[]){

        v[0] = this.knot(t_i[0]);
        v[1] = this.knot(t_i[1]);
        v[2] = this.knot(t_i[2]);
        v[3] = this.knot(t_i[3]);
        v[4] = this.knot(t_i[4]);

        vv[0] = subtract(v[1], v[0]);
        vv[1] = subtract(v[2], v[0]);
        vv[2] = subtract(v[3], v[0]);
        vv[3] = subtract(v[4], v[0]);
        vv[4] = subtract(v[2], v[1]);
        vv[5] = subtract(v[3], v[1]);
        vv[6] = subtract(v[4], v[1]);
        vv[7] = subtract(v[3], v[2]);
        vv[8] = subtract(v[4], v[2]);

        nv[0] = lenv(vv[0]);
        nv[1] = lenv(vv[1]);
        nv[2] = lenv(vv[2]);
        nv[3] = lenv(vv[3]);
        nv[4] = lenv(vv[4]);
        nv[5] = lenv(vv[5]);
        nv[6] = lenv(vv[6]);
        nv[7] = lenv(vv[7]);
        nv[8] = lenv(vv[8]);

        for(var i =0; i<9; i++){
            if(nv[i] < this._calc.error_field){
                return true;
                }
        }

        dv[0] = this.dknot(t_i[1]);
        dv[1] = this.dknot(t_i[2]);
        dv[2] = this.dknot(t_i[3]);
        dv[3] = this.dknot(t_i[4]);

        vdv[0] = dot(vv[0],dv[0]);
        vdv[1] = dot(vv[4],dv[0]);
        vdv[2] = dot(vv[5],dv[0]);
        vdv[3] = dot(vv[6],dv[0]);
        vdv[4] = dot(vv[1],dv[1]);
        vdv[5] = dot(vv[4],dv[1]);
        vdv[6] = dot(vv[7],dv[1]);
        vdv[7] = dot(vv[8],dv[1]);
        vdv[8] = dot(vv[2],dv[2]);
        vdv[9] = dot(vv[5],dv[2]);
        vdv[10] = dot(vv[7],dv[2]);
        vdv[11] = dot(vv[3],dv[3]);
        vdv[12] = dot(vv[6],dv[3]);
        vdv[13] = dot(vv[8],dv[3]);

        d2v[0] = this.d2knot(t_i[1]);
        d2v[1] = this.d2knot(t_i[2]);
        d2v[2] = this.d2knot(t_i[3]);
        d2v[3] = this.d2knot(t_i[4]);

        vd2v[0] = dot(vv[0],d2v[0]);
        vd2v[1] = dot(vv[4],d2v[0]);
        vd2v[2] = dot(vv[5],d2v[0]);
        vd2v[3] = dot(vv[6],d2v[0]);
        vd2v[4] = dot(vv[1],d2v[1]);
        vd2v[5] = dot(vv[4],d2v[1]);
        vd2v[6] = dot(vv[7],d2v[1]);
        vd2v[7] = dot(vv[8],d2v[1]);
        vd2v[8] = dot(vv[2],d2v[2]);
        vd2v[9] = dot(vv[5],d2v[2]);
        vd2v[10] = dot(vv[7],d2v[2]);
        vd2v[11] = dot(vv[3],d2v[3]);
        vd2v[12] = dot(vv[6],d2v[3]);
        vd2v[13] = dot(vv[8],d2v[3]);


        dvdv[0] = dot(dv[0],dv[0]);
        dvdv[1] = dot(dv[0],dv[1]);
        dvdv[2] = dot(dv[0],dv[2]);
        dvdv[3] = dot(dv[0],dv[3]);
        dvdv[4] = dot(dv[1],dv[1]);
        dvdv[5] = dot(dv[1],dv[2]);
        dvdv[6] = dot(dv[1],dv[3]);
        dvdv[7] = dot(dv[2],dv[2]);
        dvdv[8] = dot(dv[3],dv[3]);

        return false;

    }

    
    private knot(param : number) : vec3{
        const t = param * 2 * pi;

        return vec3.add(
            vec3.create(),
            vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scale(vec3.create(), this._cosCoef[5], cos(6*t)), this._cosCoef[4], cos(5*t)), this._cosCoef[3], cos(4*t)), this._cosCoef[2], cos(3*t)), this._cosCoef[1], cos(2*t)), this._cosCoef[0], cos(t)),
            vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scale(vec3.create(), this._sinCoef[5], sin(6*t)), this._sinCoef[4], sin(5*t)), this._sinCoef[3], sin(4*t)), this._sinCoef[2], sin(3*t)), this._sinCoef[1], sin(2*t)), this._sinCoef[0], sin(t))
        )
    }

    private dknot(param : number) : vec3{
        const t = param * 2 * pi;

        return vec3.scale(
            vec3.create(), 
            vec3.add(
                vec3.create(),
                vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scale(vec3.create(), this._dcosCoef[5], cos(6*t)), this._dcosCoef[4], cos(5*t)), this._dcosCoef[3], cos(4*t)), this._dcosCoef[2], cos(3*t)), this._dcosCoef[1], cos(2*t)), this._dcosCoef[0], cos(t)),
                vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scale(vec3.create(), this._dsinCoef[5], sin(6*t)), this._dsinCoef[4], sin(5*t)), this._dsinCoef[3], sin(4*t)), this._dsinCoef[2], sin(3*t)), this._dsinCoef[1], sin(2*t)), this._dsinCoef[0], sin(t))
            ),
            2*pi
        )
    }

    private d2knot(param : number) : vec3{
        const t = param * 2 * pi;
        return vec3.scale(
            vec3.create(),
            vec3.add(
                vec3.create(),
                vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(),vec3.scale(vec3.create(), this._d2cosCoef[5], cos(6*t)),  this._d2cosCoef[4], cos(5*t)), this._d2cosCoef[3], cos(4*t)), this._d2cosCoef[2], cos(3*t)), this._d2cosCoef[1], cos(2*t)), this._d2cosCoef[0], cos(t)),
                vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scaleAndAdd(vec3.create(), vec3.scale(vec3.create(), this._d2cosCoef[5], sin(6*t)), this._d2sinCoef[4], sin(5*t)), this._d2sinCoef[3], sin(4*t)), this._d2sinCoef[2], sin(3*t)), this._d2sinCoef[1], sin(2*t)), this._d2sinCoef[0], sin(t))
            ),
            4*pi*pi
        )
    }



    private c5_ptolemy(list : number[][]) : number[][]
    {
        
        var quint = [];
        const max_iter : number = 250;

        var v : vec3[] = new Array(5);
        var vv : vec3[] = new Array(9);
        var nv : number[] = new Array(9);
        var dv : vec3[] = new Array(4);
        var vdv : number[] = new Array(14);
        var dvdv : number[] = new Array(9);
        var d2v : vec3[] = new Array(4);
        var vd2v : number[] = new Array(14);

        var t_i : vec5 = [0,0,0,0,0];

        var grad : vec4 = [0,0,0,0];
        var grad_length : number;
        var diff : vec4 = [0,0,0,0];
        var ptol : number;

        var hess : mat4 = [0,0,0,0,
            0,0,0,0,
            0,0,0,0,
            0,0,0,0];


        const stop_double = 0.00001;

        var bad_abort = false;


        var i : number;
        

        var iter = 0;

        const c : number = 0.0001;
        const rho : number = 0.75;
        var alpha : number;

        var diff_len : number;
        var grad_dot_diff : number;

        var counter : number;
        var x_n : vec5 = [0,0,0,0,0];
        var func : number;                          

        
        
        


        for(let ticker = 0; ticker < list.length; ticker++){

            t_i[0] = list[ticker][0];
            t_i[1] = list[ticker][1];
            t_i[2] = list[ticker][2];
            t_i[3] = list[ticker][3];
            t_i[4] = list[ticker][4];

            iter = 0;

            while(iter<max_iter){

                bad_abort = this.setvariables(t_i, v, nv, vv, dv, vdv, dvdv, d2v, vd2v);

                if(bad_abort){
                    break;
                }

                ptol = nv[0]*nv[8]+nv[1]*nv[6]-nv[3]*nv[4] + nv[2]*nv[4]+nv[5]*nv[1]-nv[0]*nv[7];
                this.gradient_ptolemy(nv, vdv, grad);
                this.hessian_ptolemy(nv, vdv , dvdv, vd2v, hess);

                grad_length = Math.sqrt(
                    Math.pow(grad[0], 2)
                    + Math.pow(grad[1], 2)
                    + Math.pow(grad[2], 2)
                    + Math.pow(grad[3], 2)
                )

                
                if((grad_length < 0.0000001) || (ptol <= 0.0000001)){
                    if(ptol > 0.0000001){
                        break;
                    }
                    var [center, normal, radius] = this.toCVR(this.knot(t_i[0]),this.knot(t_i[1]),this.knot(t_i[2]));
                    quint.push([t_i,center, normal, radius].flat());
                    break;
                }



                diff = this.modified_Cholesky(hess, grad);


                counter =0;
                alpha = 1.0/rho;

                diff_len = Math.sqrt(
                    Math.pow(diff[0], 2)
                    + Math.pow(diff[1], 2)
                    + Math.pow(diff[2], 2)
                    + Math.pow(diff[3], 2)
                );

                grad_dot_diff = (
                        grad[0]*diff[0]
                        + grad[1]*diff[1]
                        + grad[2]*diff[2]
                        + grad[3]*diff[3]
                );

                do{

                    alpha *= rho;
                    counter++;
                    
                    x_n[0] = t_i[0];
                    for(i = 0; i<4; i++){
                        x_n[i+1] = t_i[i+1] - alpha*diff[i];
                    }

                    v[1] = this.knot(x_n[1]);
                    v[2] = this.knot(x_n[2]);
                    v[3] = this.knot(x_n[3]);
                    v[4] = this.knot(x_n[4]);

                    vv[0] = subtract(v[1], v[0]);
                    vv[1] = subtract(v[2], v[0]);
                    vv[2] = subtract(v[3], v[0]);
                    vv[3] = subtract(v[4], v[0]);
                    vv[4] = subtract(v[2], v[1]);
                    vv[5] = subtract(v[3], v[1]);
                    vv[6] = subtract(v[4], v[1]);
                    vv[7] = subtract(v[3], v[2]);
                    vv[8] = subtract(v[4], v[2]);


                    nv[0] = lenv(vv[0]);
                    nv[1] = lenv(vv[1]);
                    nv[2] = lenv(vv[2]);
                    nv[3] = lenv(vv[3]);
                    nv[4] = lenv(vv[4]);
                    nv[5] = lenv(vv[5]);
                    nv[6] = lenv(vv[6]);
                    nv[7] = lenv(vv[7]);
                    nv[8] = lenv(vv[8]);

                    func =  nv[0]*nv[8]+nv[1]*nv[6]-nv[3]*nv[4] + nv[2]*nv[4]+nv[5]*nv[1]-nv[0]*nv[7];

                }while((func > (ptol - c*alpha*grad_dot_diff))&& (alpha*diff_len>0.000005) && (counter < 20));

                t_i = [x_n[0], x_n[1], x_n[2], x_n[3], x_n[4]];

                this.decim(t_i);

                if(this.proxim(t_i, 0.0002)){
                    break;
                }

                iter++;

            } 


        }
        
        return <number[][]>quint;
        
    }


}


function contains(arr : number[], value: number) : boolean {
    var index = arr.indexOf(value);
    if (index > -1) {
      return true;
    }
    return false;
  }



function subtract (a : vec3, b : vec3) : vec3{
    return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
}
function addv(a : vec3, b : vec3) : vec3{
    return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
}
function lenv (a : vec3) : number{
    return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
}
function scalarmult (c : number, a : vec3) : vec3{
    return [c*a[0], c*a[1], c*a[2]];
}
function dot (a : vec3, b : vec3) : number {
    return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
}
function crossprod(a : vec3, b : vec3) : vec3 {
    return [a[1]*b[2]- a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function normalize(a : vec3) : vec3 {
    const lena = lenv(a);
    return [a[0]/lena,a[1]/lena,a[2]/lena];
}

